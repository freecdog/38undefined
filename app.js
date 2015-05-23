var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var session = require('express-session');
var _ = require('underscore');
var fs = require('fs');
var crypto = require('crypto');

var routes = require('./routes/index');
var predictionGame = require('./routes/predictionGame');
var restartServerRoute = require('./routes/restartServer');
var api = require('./routes/api');

var app = express();

// default config
var config = {
    "minPlayers" : 2,
    "secret": "someSecret"
};

var noop = function(){};
function readJSONFile(filepath, callback){
    callback = callback || noop;
    fs.readFile(filepath, {encoding: "utf8"}, function(err, filedata){
        if (err) {
            console.log("read error:", err);
            callback(e, null);
        } else {
            // some hack with first symbol =/
            filedata = filedata.replace(/^\uFEFF/, '');
            // parsing file to JSON object
            var jsondata = JSON.parse(filedata);

            callback(null, jsondata);
        }
    });
}
function writeJSONFile(filepath, jsondata, callback){
    callback = callback || noop;
    fs.writeFile(filepath, JSON.stringify(jsondata), {encoding: "utf8"}, function (err) {
        if (err) {
            console.log("write error:", err);
            callback(e, null);
        } else {
            console.log('File has been successfully written');
            callback();
        }
    });
}

// TODO. Looks like I've done it, but tricky and odd solution
// When service restarting it terminate parent process
// so chilren process terminate too. Thus child_process that had been
// executed can't finish process of restarting server.
// http://nodejs.org/api/child_process.html
// Advanced ci: http://www.carbonsilk.com/node/deploying-nodejs-apps/
// tags: ci, continious integration
var exec = require('child_process').exec;
var spawn = require('child_process').spawn;
//var execFile = require('child_process').execFile;
function restartServer(){
    //execFile('./restart.sh');
    //exec("sudo service node38 restart", function (error, stdout, stderr) {
    //    if (error !== null) console.log('exec error: ' + error);
    //});
    //spawn("sudo service node38 restart");
    //spawn("sudo", ['service', 'node38', 'restart']);

    // spawn will ruin server so Forever should back it up.
    spawn("sudo service node38 restart");
}
function updateServer(callback){
    // update from github
    exec("git --git-dir=" + path.join(__dirname, '.git') + " --work-tree=" + __dirname + " pull origin master", callback);
}

function getHash(password){
    var hash = crypto.createHash('sha512');
    hash.update(password, 'utf8');

    return hash.digest('base64');
}

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

// uncomment after placing your favicon in /public
//app.use(favicon(__dirname + '/public/favicon.ico'));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(session({
    secret: config.secret,
    cookie: {
        expires: null,
        maxAge: null
    }
}));
app.use(require('stylus').middleware(path.join(__dirname, 'public')));
app.use(express.static(path.join(__dirname, 'public')));

//app.use('/', routes);
app.use('/', predictionGame);
//app.use('/pg', predictionGame);
app.use('/api', api);
//app.use('/bootstrap', function(req, res){
//    res.render('bootstrapView1', {});
//});
app.use('/restartServer', restartServerRoute);

// variables
var TODOs = [];

var connectedCookies = {};
var gamesCounter = 0;
var games = {};
var gamesInProgress = {};
var filenames = [];
var lastFileNamesUpdate = new Date(0).getTime();

function readTODOs(callback){
    callback = callback || noop;
    readJSONFile(path.join(__dirname, 'usertodos.txt'), function(err, jsondata){
        if (jsondata){
            // extend, because I want to save link for original TODOs object which used in writeTODOs
            _.extend(TODOs, jsondata);
            //console.log("read TODOs:", TODOs);
            callback(err, TODOs);
        } else {
            console.log('No json data in file');
            callback(err);
        }
    });
}
// just read TODOs from usertodos.txt
readTODOs();

function writeTODO(newTODO){
    var filepath = path.join(__dirname, 'usertodos.txt');
    TODOs.push(newTODO);
    console.log("updated TODOs before writing:", TODOs);
    writeJSONFile(filepath, TODOs, function(){
        console.log("newTODO was successfully added");
    });
}

function generatePlayerName(){
    return "player" + (10000 * Math.random()).toFixed(0);
}
// TODO probably cookie can store game(s) where it involved
function removeExpiredConnections(){
    var curTime = new Date();

    // http://jsperf.com/stackoverflow-for-vs-hasownproperty/7
    // V8 shows that hasOwnProperty is really slower than object[key] find

    for (var key in connectedCookies) {
        //if (connectedCookies.hasOwnProperty(key)) {
        if (connectedCookies[key] !== undefined) {
            //console.log ( (curTime - connectedCookies[key]).toString() );
            if (Math.abs(curTime - connectedCookies[key].time) > 600000) {   // initially 10 min

                for (var gInd in games) {
                    //if (games.hasOwnProperty(gInd)){
                    if (games[gInd] !== undefined){
                        var game = games[gInd];
                        for (var playerIndex in game.players) {
                            //if (game.players.hasOwnProperty(playerIndex)){
                            if (game.players[playerIndex] !== undefined){
                                var player = game.players[playerIndex];
                                if (player == key) {
                                    //console.log("games[" + gInd + "] deleted");
                                    //delete games[gInd];
                                    if (game.status != 90){
                                        game.status = -1;
                                        game.endTime = new Date();
                                        game.duration = game.endTime - game.startTime;  // ms
                                    }
                                    break;
                                }
                            }
                        }
                    }
                }
                console.log("Cookie[" + key + "] deleted");
                delete connectedCookies[key];
            }
        }
    }
}
function createPlayer(){
    var connectedCookie = {};
    connectedCookie.time = new Date();
    //connectedCookie.status = 1; // connected
    connectedCookie.searchPlayersCount = 2; // default value
    return connectedCookie;
}
function generateImageList(){
    //var imgsPath = "/images/banksy";
    var imgsPath = "/images/lotsofimgs";

    console.log(Math.abs((new Date()).getTime() - lastFileNamesUpdate));
    if (Math.abs((new Date()).getTime() - lastFileNamesUpdate) > 60000){
        lastFileNamesUpdate = (new Date()).getTime();

        console.log("trying to update filenames list");
        console.log(path.join(__dirname, 'public' + imgsPath));
        filenames = fs.readdirSync(path.join(__dirname, 'public' + imgsPath));
        if (!filenames){
            filenames = [];
            console.log("Looks like there are no files at all, or wrong directory.");
        }
        // use only jpg and png files (folders non-acceptable =) )
        filenames = _.filter(filenames, function(filename){
            return filename.toLowerCase().indexOf('jpg') != -1 || filename.toLowerCase().indexOf('png') != -1;
        });
    }

    var recentFiles = _.sample(filenames, 10);
    recentFiles = _.map(recentFiles,function(filename){
        return imgsPath + '/' + filename;
    });

    return recentFiles;
}
// connectedCookie status:
// 1 — connected
// 2 — searching for game
// 3 — play a game
function apiFindGame(req, res, connectedCookie, searchPlayersCount){
    connectedCookie.time = new Date();
    if (connectedCookie.status == 1)
        connectedCookie.status = 2;
    connectedCookie.searchPlayersCount = searchPlayersCount;

    console.log(req._remoteAddress + ", searching for game, online: " + Object.keys(connectedCookies).length.toString());

    prepareGame(searchPlayersCount);
    var game = findGameById(req.sessionID);
    console.log("game:", game ? game._id : null);//, JSON.stringify(game));
    if (game == null) {
        var onlineStatistics = collectOnlineStatistics(searchPlayersCount);

        res.send(onlineStatistics);
    } else {
        var playerIndex = getPlayerIndexInGame(game, req.sessionID);
        //game.playerIndex = playerIndex;
        var gameWithPlayerIndex = {playerIndex: playerIndex};
        _.extend(gameWithPlayerIndex, game);
        console.log("game to send (findGame):", gameWithPlayerIndex);

        res.send(gameWithPlayerIndex);
    }

    removeExpiredConnections();
}
function prepareGame(numberOfPlayers) {
    var wannaPlayers = [];

    for (var key in connectedCookies) {
        if (connectedCookies[key] !== undefined) {
            var player = connectedCookies[key];
            player.id = key;
            // if status "searching"
            if (player.status == 2 && player.searchPlayersCount == numberOfPlayers) {
                wannaPlayers.push(key);
            }
        }
    }

    var wannaPlayersLength = wannaPlayers.length;
    //if (len >= config.minPlayers) {
    if (wannaPlayersLength >= numberOfPlayers) {
        var gameId = "g" + gamesCounter.toString();
        gamesCounter++;

        var game = {};
        games[gameId] = game;
        game._id = gameId;
        game.players = [];
        game.status = 20;
        game.startTime = new Date();
        game.rounds = [];

        game.images = generateImageList();

        for (var i = 0; i < numberOfPlayers; i++) {
            // Taking settings of first player
            //if (i==0) {
            //    game.settings = connectedCookies[wannaPlayers[i]].settings;
            //    game.boxes = connectedCookies[wannaPlayers[i]].boxes;
            //}

            var userSessionId = wannaPlayers[i];
            game.players.push(userSessionId);
            if (game.names == null) game.names = [];

            var connectedCookie = connectedCookies[userSessionId];
            if (connectedCookie.name == null){
                connectedCookie.name = generatePlayerName();
            }
            game.names.push(connectedCookie.name);

            game.rounds.push([]);

            connectedCookie.status = 3;
        }
        console.log("names:", game.names, 'in game', game._id);//, JSON.stringify(game));
    }
}
// TODO, now it returns last game of player while iterating through ALL amount of games
// should do something with it
function findGameById(sessionId) {
    var ans = null;

    function isThisGameMine(game){
        var isIt = false;

        var leftPlayers = game.leftPlayers;
        leftPlayers = leftPlayers || {};
        if (leftPlayers[sessionId] === undefined) {
            for (var j = 0; j < game.players.length; j++) {
                if (sessionId == game.players[j]) {
                    isIt = true;
                }
            }
        }
        return isIt;
    }

    for (var gInd in games) {
        var game = games[gInd];
        if (game.status != -1) {
            if (isThisGameMine(game)) {
                //return game;
                ans = game;
            }
        }
    }
    //return null;
    return ans;
}
function getPlayerIndexInGame(game, sessionID){
    var ans = -1;
    for (var i = 0; i < game.players.length; i++){
        if (sessionID == game.players[i]) {
            ans = i;
            break;
        }
    }
    return ans;
}
function isEndOfGame(game){
    var leftPlayers = game.leftPlayers;
    leftPlayers = leftPlayers || {};
    for (var i = 0; i < game.rounds.length; i++) {
        // if player left so end of game is closer
        if (leftPlayers[game.players[i]] !== undefined) continue;

        var len = game.rounds[i].length;
        if (len < 2) {
            return false;
        }
    }
    return true;
}
function endOfGame(game){
    game.status = 90;

    var leftPlayers = game.leftPlayers;
    leftPlayers = leftPlayers || {};

    game.results = "Results would be here soon";

    game.endTime = new Date();
    game.duration = game.endTime - game.startTime;  // ms

    console.log("game ends:", game._id);
}

function collectOnlineStatistics(searchPlayersCount){
    var data = {};
    data.playersOnline = Object.keys(connectedCookies).length;
    data.playersSearching = 0;
    data.activeGames = 0;
    for(var player in connectedCookies) {
        if (connectedCookies[player] !== undefined){
            var connectedCookie = connectedCookies[player];
            if (connectedCookie.status == 2) {
                if (searchPlayersCount == null) data.playersSearching++;
                else if (connectedCookie.searchPlayersCount == searchPlayersCount) data.playersSearching++;
            }
        }
    }
    for (var game in games) {
        if (games[game] !== undefined){
            if (games[game].status == 20) data.activeGames++;
        }
    }
    return data;
}

// Apply to Express 4
// connect with api.js
app.connectedCookies = connectedCookies;
app.games = games;
app.TODOs = TODOs;

app.restartServer = restartServer;
app.updateServer = updateServer;
app.getHash = getHash;

app.removeExpiredConnections = removeExpiredConnections;
app.createPlayer = createPlayer;
app.apiFindGame = apiFindGame;
app.prepareGame = prepareGame;
app.findGameById = findGameById;
app.getPlayerIndexInGame = getPlayerIndexInGame;
app.isEndOfGame = isEndOfGame;
app.endOfGame = endOfGame;

app.collectOnlineStatistics = collectOnlineStatistics;

app.readTODOs = readTODOs;
app.writeTODO = writeTODO;

// catch 404 and forward to error handler
app.use(function(req, res, next) {
    var err = new Error('Not Found');
    err.status = 404;
    next(err);
});

// error handlers

// development error handler
// will print stacktrace
if (app.get('env') === 'development') {
    app.use(function(err, req, res, next) {
        res.status(err.status || 500);
        res.render('error', {
            message: err.message,
            error: err
        });
    });
}

// production error handler
// no stacktraces leaked to user
app.use(function(err, req, res, next) {
    res.status(err.status || 500);
    res.render('error', {
        message: err.message,
        error: {}
    });
});

module.exports = app;
