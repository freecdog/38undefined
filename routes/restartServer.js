/**
 * Created by jaric on 23.05.2015.
 */

var express = require('express');
var router = express.Router();

router.get('/', function(req, res){
    res.render('restartServer', {});
});
router.post('/', function(req, res){
    console.log('going to restart server', req.connection.remoteAddress, new Date());
    if(req.body.name && req.body.password){
        console.log(req.body.name, req.body.updateOnly);
        var passHash = req.app.getHash(req.body.password);
        if (req.body.name=='jaric' && passHash=='bXSdeiUOrFs6OEO6jzlsXMVatr0V3ih4t8EpDLbh7b6y5mbV5uk1f5XD2na5oSWRYyY9mSg9rGauTr7rI01plA=='){
            if (req.body.updateOnly !== undefined && req.body.updateOnly == 'on') {
                req.app.updateServer(function(error, stdout, stderr){
                    if (!error){
                        res.render('restartServer', {
                            message: 'successfully updated',
                            serverTime: new Date(),
                            error: JSON.stringify(error),
                            stdout: JSON.stringify(stdout),
                            stderr: JSON.stringify(stderr)
                        });
                    } else {
                        res.render('restartServer', {
                            message:'something goes wrong',
                            serverTime: new Date(),
                            error: JSON.stringify(error),
                            stdout: JSON.stringify(stdout),
                            stderr: JSON.stringify(stderr)
                        });
                    }
                });
            } else {
                req.app.updateServer(function(error, stdout, stderr){
                    if (!error){
                        res.render('restartServer', {
                            message: 'successfully updated and going to reboot',
                            serverTime: new Date(),
                            error: JSON.stringify(error),
                            stdout: JSON.stringify(stdout),
                            stderr: JSON.stringify(stderr)
                        });
                    } else {
                        res.render('restartServer', {
                            message:'something goes wrong with update and going to reboot',
                            serverTime: new Date(),
                            error: JSON.stringify(error),
                            stdout: JSON.stringify(stdout),
                            stderr: JSON.stringify(stderr)
                        });
                    }
                    req.app.restartServer();
                });
            }
        } else res.send('No, inc');
    } else res.send('No');
});

module.exports = router;