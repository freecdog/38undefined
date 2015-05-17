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
        res.send();
    }
});
router.get("/stopFindGame", function(req, res){
    var connectedCookies = req.app.connectedCookies;

    var connectedCookie = connectedCookies[req.sessionID];
    if (connectedCookie !== undefined) {
        console.log('here in stopFindGame');
        connectedCookie.time = new Date();
        if (connectedCookie.status == 2)
            connectedCookie.status = 1;

        req.app.removeExpiredConnections();

        console.log('and here in stopFindGame');
        console.log(req.connection.remoteAddress + ", stop find game, online: " + Object.keys(connectedCookies).length.toString());

        res.send("1");
        console.log('and may be here in stopFindGame');
    } else {
        res.send("-1");
    }
});


module.exports = router;
