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

module.exports = router;
