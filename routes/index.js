var express = require('express');
var router = new express.Router();
var serial = require('./serial');

var game_scipt_parser = require('../controllers/game_script_parser')
var game_controller = require('../controllers/game_controller');


/* GET home page. */
router.get('/', function(req, res, next) {
  res.send('index :D');
});
//NOTE INDEX PAGE NOT WORKING AT ALL.........USE APP.JS FOR ROUTES!!!!!!

//Incomming test data message from server
router.get('/server_test/:data', function(req, res, next) {
  serial.port_write(req.params.data)
  res.send("Success")
  
  //do something else with the data here, probs go to a controller
  console.log(req.params.data)
});

//update game script
router.get('/update', game_scipt_parser.gs_update)

//Incomming test data message from mock device
router.get('/device_test/:data', game_controller.parse_http_event);

// router.get('/force_action/:data', game_controller.force_action);

router.get('/force_action/:data', game_controller.force_action);

router.get('/test_out', game_controller.test_out);

// router.post('/force_action', game_controller.force_action);

module.exports = router;
