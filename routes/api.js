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
        files = _.shuffle(files);
        files.splice(10);
        res.send({ files: files });
    });
});

module.exports = router;
