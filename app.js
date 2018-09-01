"use strict"
var express = require('express');
var path = require('path');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var index = require('./routes/index');
var serial = require('./routes/serial');
var app = express();
var http = require('http');
var server = require('http').createServer(app); 
var serial = require('./routes/serial');
var game_controller = require('./controllers/game_controller');
var shell_commands = require('./controllers/shell_commands');

app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
// app.use(express.static(path.join(__dirname, 'public')));
app.use(express.static(path.join( __dirname,'/')));

app.use('/', index);

var port = 5002

// var port = normalizePort(process.env.PORT || '3000');
app.set('port', port);
// var server = http.createServer(app);
// app.listen(port)
server.listen(port, '0.0.0.0');
server.on('error', onError);
server.on('listening', onListening);

function onListening() {
    var addr = server.address();
    console.log('Server on port : '+addr.port);
  }

function onError(error) {
if (error.syscall !== 'listen') {
    throw error;
}
}

//==========================================================
//==========================================================
//======================ROUTES==============================
//==========================================================
//==========================================================

/* GET home page. */
app.get('/', function(req, res, next) {
    res.send('index :D');
  });

app.get('/test_outgoing', game_controller.test_out)

//Incomming test data message from server
app.get('/server_test/:data', function(req, res, next) {
serial.port_write(req.params.data)
res.send("Success")

//do something else with the data here, probs go to a controller
console.log(req.params.data)
});


//Incomming test data message from mock device
app.get('/force_event/:data', game_controller.parse_http_event);

app.get('/force_action/:data', game_controller.force_action);

app.get('/test_out', game_controller.test_out);

/**
/////////////
Shell commands
////////////
**/
app.get('/reboot_now', shell_commands.reboot_now)

app.get('/git_update', shell_commands.update)

app.get('/custom_command/:cmd', shell_commands.custom_command)

module.exports = app;
