var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var session = require('express-session');
var _ = require('underscore');
var fs = require('fs');

var routes = require('./routes/index');
var predictionGame = require('./routes/predictionGame');
var api = require('./routes/api');

var app = express();

// default config
var config = {
    "minPlayers" : 2,
    "secret": "someSecret"
};

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

app.use('/', routes);
app.use('/pg', predictionGame);
app.use('/api', api);
app.use('/bootstrap', function(req, res){
    res.render('bootstrapView1', {});
});

// variables
var connectedCookies = {};
var gamesCounter = 0;
var games = {};
var gamesInProgress = {};

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
            if (Math.abs(curTime - connectedCookies[key].time) > 600000) {   // 10 min

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
    var filenames = fs.readdirSync('./public/images/banksy');
    if (!filenames){
        filenames = [];
        console.log("Looks like there are no files at all, or wrong directory.");
    }
    // use only jpg and png files (folders non-acceptable =) )
    filenames = _.filter(filenames, function(filename){
        return filename.toLowerCase().indexOf('jpg') != -1 || filename.toLowerCase().indexOf('png') != -1;
    });
    filenames = _.sample(filenames, 10);

    return filenames;
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
            // if status "searching"
            var player = connectedCookies[key];
            player.id = key;
            if (player.status == 2 && player.searchPlayersCount == numberOfPlayers) {
                wannaPlayers.push(key);
            }
        }
    }

    var len = wannaPlayers.length;
    //if (len >= config.minPlayers) {
    if (len >= numberOfPlayers) {
        var gameId = "g" + gamesCounter.toString();
        gamesCounter++;

        var game = {};
        games[gameId] = game;
        game._id = gameId;
        game.players = [];
        game.status = 20;
        game.startTime = new Date();

        game.images = generateImageList();

        for (var i = 0; i < len; i++) {
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

            if (game.rounds == null) game.rounds = [];
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

app.removeExpiredConnections = removeExpiredConnections;
app.createPlayer = createPlayer;
app.apiFindGame = apiFindGame;
app.prepareGame = prepareGame;
app.findGameById = findGameById;
app.getPlayerIndexInGame = getPlayerIndexInGame;

app.collectOnlineStatistics = collectOnlineStatistics;


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
