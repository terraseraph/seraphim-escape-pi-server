'use strict';
const SerialPort = require('serialport');
const game_controller = require('../controllers/game_controller')
const Validator = require('json-valid');

var start_Timer = Date.now()
///begin mock binding------
//========== Create a port and enable the echo and recording.
// const SerialPort = require('serialport/test');
// const MockBinding = SerialPort.Binding;
// MockBinding.createPort('/dev/ROBOT', { echo: true, record: true })
// const port = new SerialPort('/dev/ROBOT')

//----NOTE: delete node_modules, npm install, npm install serialport, npm start

///=====--------end mock binding-------------------

//---------For pc usb------------------//
//Bind the port
// var SerialPort = require('serialport');
// var port = new SerialPort('/dev/tty-usbserial1', {
//   baudRate: 115200
// });

//====For pi =============
// const Readline = SerialPort.parsers.Readline;
// const parser = new Readline();
// const port = new SerialPort('COM8', {
//   baudRate : 9600,
//   lock : true,
//   // parser: port.parsers.readline('\n')
// });
// port.pipe(parser);

const Readline = require('parser-readline')
const port = new SerialPort('/dev/ttyUSB0', {
  baudRate : 115200,
  lock : true,
  // parser: port.parsers.readline('\n')
});
const parser = port.pipe(new Readline({ delimiter: '\r\n' }))
// parser.on('data', console.log)


console.log ("Serial port open")
//=== end pi serial port======

// var rest = require('./rest');
const request = require('request');


var acknowledge = {
  fromId: "255",
  toId : "20",
  action : 'start',
  actionType : 'relay',
  event : 'noneE',
  eventType : 'noneET',
  data : '6'
}

var model = {
  fromId: "number",
  toId : "number",
  action : 'string',
  actionType : 'string',
  event : 'string',
  eventType : 'string',
  data : 'string'
}

var validator = new Validator(model);

var cnt = 0;
var cnt1 = 0

/////////////////////////////
///// Events ///////////////
///////////////////////////
port.on('error', function(err) {
  console.log('Error: ', err.message);
})
//Listens to the port for messages

parser.on('data', function(data){
  // var data = data.toString('utf8');
  start_Timer = Date.now()
//  console.log("=======Serial parser.on()========")
  // parser.pause();
  // port.pause();
  var str = data;
  str = str.toString(); //Convert to string
  str = str.replace(/\r?\n|\r/g, ""); //remove '\r' from this String
  console.log("msg: ", str)
  try {
    // the synchronous code that we want to catch thrown errors on
    game_controller.parse_event(str)
    var err = new Error('Mad Error')
    // throw err
  } catch (err) {
    // handle the error safely
    console.log(err)
  }  
  // port.resume();
  // parser.resume();
  })



////////////////////////////////
///// Functions ///////////////
//////////////////////////////

// Writes to the port
//Note: consider JSON.stringify(data) before sending.... not sure if breaking...
exports.port_write = function(data, callback){
  cnt1 += 1
  console.log("Total writes to port: ", cnt1)
  console.log("===== Data to be written to serial ===== ", data)

  data = JSON.stringify(data) //MIGHT BREAK ON THE PI
  // parser.pause()
  port.write(data + "\n", function(err) {
    if (err) {
      console.log('Error on write: ', err.message);
      return
    }
    //=====####Draining and flushing cruurently broken!!!!!!!####=============
    // port.drain(function() {
    //   console.log("=============Draining PORT===========================")
    //   // port.flush();
    // });
    console.log('======= message written to serial==========');
    console.log(data)
    console.log('======= time taken to send ==========')
    console.log(Date.now() - start_Timer, "ms")
    // parser.resume()
    callback("data written")
  });
}
  
  