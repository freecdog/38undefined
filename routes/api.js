/**
 * Created by jaric on 14.05.2015.
 */

var express = require('express');
var router = express.Router();
var fs = require('fs');
var _ = require('underscore');

router.get('/images', function(req, res, next) {
    fs.readdir('./public/images', function(err, files){
        if (!files){
            files = [];
        }
        //files = _.shuffle(files);
        //files.splice(10);
        // Produce a random sample from the list
        files = _.sample(files, 10);
        res.send({ files: files });
    });
});

router.get('/images/10', function(req, res, next) {
    fs.readdir('./public/images/banksy', function(err, files){
        if (!files){
            files = [];
        }
        // use only jpg and png files (folders non-acceptable =) )
        files = _.filter(files, function(filename){
            return filename.toLowerCase().indexOf('jpg') != -1 || filename.toLowerCase().indexOf('png') != -1;
        });

        files = _.sample(files, 10);
        var images1 = [], images2 = [];
        for (var i = 0; i < 10; i++) {
            if (i < 5) images1.push(files[i]);
            else images2.push(files[i]);
        }
        res.send({ images1: images1, images2: images2 });
    });
});


router.get("/connectPlayer", function(req, res){
    var connectedCookies = req.app.connectedCookies;

    var connectedCookie = connectedCookies[req.sessionID];
    if (connectedCookie !== undefined){
        console.log('Already have this cookie, id:', req.sessionID);
        connectedCookie.time = new Date();
        if (connectedCookie.status === undefined) {
            //connectedCookie.status = 2;
            connectedCookie.status = 1;
        }
        //if (connectedCookie.status == 80) connectedCookie.status = 2;
    } else {
        console.log('trying to createPlayer, id:', req.sessionID);
        connectedCookie = req.app.createPlayer();
        connectedCookies[req.sessionID] = connectedCookie;
        connectedCookie.status = 1; // connected
    }
    console.log(req._remoteAddress + ", players connected, online: " + Object.keys(connectedCookies).length.toString());
    var data = req.app.collectOnlineStatistics();
    data.sessionID = req.sessionID;

    res.send(data);
    req.app.removeExpiredConnections();
});
router.get("/disconnectPlayer", function(req, res){
    var connectedCookies = req.app.connectedCookies;

    var connectedCookie = connectedCookies[req.sessionID];
    if (connectedCookie !== undefined) {
        connectedCookie.time = 0;
    }
    req.app.removeExpiredConnections();

    console.log(req._remoteAddress + ", disconnected, online: " + Object.keys(connectedCookies).length.toString());
    res.send(Object.keys(connectedCookies).length.toString());
});

router.get("/findGame", function(req, res){
    var connectedCookies = req.app.connectedCookies;

    var connectedCookie = connectedCookies[req.sessionID];
    if (connectedCookie !== undefined){
        var searchPlayersCount = 2;
        req.app.apiFindGame(req, res, connectedCookie, searchPlayersCount);
    } else {
        res.send(null);
    }
});
router.get("/stopFindGame", function(req, res){
    var connectedCookies = req.app.connectedCookies;

    var connectedCookie = connectedCookies[req.sessionID];
    if (connectedCookie !== undefined) {
        connectedCookie.time = new Date();
        if (connectedCookie.status == 2)
            connectedCookie.status = 1;

        req.app.removeExpiredConnections();

        console.log(req.connection.remoteAddress + ", stop find game, online: " + Object.keys(connectedCookies).length.toString());

        res.send("stopped find game");
    } else {
        res.send(null);
    }
});
router.get('/giveup', function(req, res){
    var connectedCookies = req.app.connectedCookies;

    var connectedCookie = connectedCookies[req.sessionID];
    if (connectedCookie !== undefined){
        connectedCookie.status = 1;

        var game = req.app.findGameById(req.sessionID);
        if (game != null){

            // why game should finished for another one?
            //if (game.status != 90) { endOfGame(game); }
            if (game.leftPlayers === undefined) {
                game.leftPlayers = {};
            }
            game.leftPlayers[req.sessionID] = true;

            var isEnd = req.app.isEndOfGame(game);
            if (isEnd) req.app.endOfGame(game);

            res.send(null);
        } else {
            console.log("game not found (/api/giveup)");
            res.send(null);
        }
    } else {
        console.log("session not found (/api/giveup)");
        res.send(null);
    }
});

router.get('/favoriteImages/:indices', function(req, res){
    var connectedCookies = req.app.connectedCookies;

    var connectedCookie = connectedCookies[req.sessionID];
    if (connectedCookie !== undefined){
        var game = req.app.findGameById(req.sessionID);
        if (game != null) {
            var playerIndex = req.app.getPlayerIndexInGame(game, req.sessionID);
            // TODO if game is found why could it be -1. Especially here, may be move it to getPlayerIndexInGame().
            if (playerIndex == -1) console.log("error while accepting combination, no player with such sessionID in this game", req.sessionID, game);

            var indices = req.params.indices;
            var playerRounds = game.rounds[playerIndex];
            if ((playerRounds.length == 0 && indices.length == 6) || (playerRounds.length == 1 && indices.length == 4)) {
                // validation of indices
                var indicesValid = true;
                for (var i = 0; i < indices.length; i++){
                    var recentIndex = parseInt(indices[i]);
                    if (recentIndex == "NaN" || recentIndex < 0 || recentIndex > 9) {
                        indicesValid = false;
                        break;
                    }
                }

                if (indicesValid){
                    playerRounds.push({
                        indices: indices
                    });

                    // end of game
                    var gameEnds = false;
                    if (playerRounds.length == 2){
                        gameEnds = req.app.isEndOfGame(game);
                        if (gameEnds) req.app.endOfGame(game);
                    }

                    console.log('accepted indices', indices, 'from', req.connection.remoteAddress);//, JSON.stringify(game));
                    res.send(game);
                } else {
                    console.log("error, such indices inappropriate, indices:", indices);
                    res.send(game);
                }

            } else {
                console.log("error, indices.length is out of range, playerRounds.length =", playerRounds.length,", length =", indices.length);
                res.send(null);
            }
        } else {
            console.log("game not found (/api/favoriteImages/:indices)");
            res.send(null);
        }
    } else {
        console.log("session not found (/api/favoriteImages/:indices)");
        res.send(null);
    }
});

router.get("/game/:gid", function(req, res){
    //console.log(prepareIpToConsole(req) + " GameProcess check" );
    var connectedCookies = req.app.connectedCookies;

    var data = {};
    var game;
    var gid = req.params.gid;
    if (gid != null && req.app.games[gid] !== undefined){
        game = req.app.games[gid];
    } else {
        game = req.app.findGameById(req.sessionID);
    }
    //console.log("game:", game._id);
    if (game) {
        //console.log("pIndex", req.session.id, game.playerIndex);

        res.send(game);

        var connectedCookie = connectedCookies[req.sessionID];
        if (connectedCookie !== undefined) {
            connectedCookie.time = new Date();
        }
        req.app.removeExpiredConnections();
    } else {
        console.log("sending empty data:", data);
        res.send(data);
    }

});

module.exports = router;
