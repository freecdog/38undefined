/**
 * Created by jaric on 15.05.2015.
 */

var express = require('express');
var router = express.Router();

router.get('/', function(req, res, next) {
    res.render('predictionGame');
});

module.exports = router;
