"use strict"
const game_script_parser = require("./game_script_parser")
const serial = require('../routes/serial');
const request = require('request');
var play = require('play')
const delay = require('delay');
const game_config = require('../config/config.json')

var server_url = game_config.server_url
var room_name = game_config.room_name

//var room_name = "ex-revenge"
// var server_url = `http://localhost:5001/` //TODO: put this in a common config place
//var server_url = `http://192.168.0.180:5001/`

var from_server = false;
var nowdata;
var actions_array = new Array()
var master_ready = false


exports.from_server_check = function(){
	return from_server
}

exports.set_master_ready = function(state){
    master_ready = state
}

exports.parse_http_event = function(req, res, next){
    console.log("PARSE_HTTP_EVENT=============")
    from_server = true;
    nowdata = "Failed Event"
    var dat = req.params.data
    console.log("game_controller.parse_http_event()", dat)
    game_script_parser.script_parse(dat, function(data){
        console.log("====== Script Result =======")
        nowdata = data
        for (var dat in data){
            actions_array.push(data[dat])
        }
        send_to_server(data)
    })
    res.send("Query: \n"+dat + '\n' + "Processed: \n"+JSON.stringify(nowdata))
    if (nowdata == "Failed Event") return;
    next(write_to_port(function(log){
        console.log(log)
        from_server = false;
    }))

}

exports.parse_event = function(data){
    if (data[0] != "{" && data.length -1 != "}") {
        return;
    }
    nowdata = "Failed Event"
    console.log("game_controller.parse_event()")
    game_script_parser.script_parse(data, function(data){
        if (data == "ready_msg"){
            console.log(data)
            return
        } 
        console.log("====== Script Result (actions found) =======")
        console.log(data)
        nowdata = data
        for (var dat in data){
            actions_array.push(data[dat])
        }
        console.log("=====*** Remaining Actions ***===== ",actions_array)
        send_to_server(data)
        write_to_port(console.log)
    })
    if (nowdata == "Failed Event") return;
}

//to be used from server... later
exports.force_action = function(req, res, next){
    nowdata = "failed action"
    console.log("forced raw == ", req.params.data)
    // var dat = JSON.parse(req.params.data)
    var dat = req.params.data
    console.log("forced parsed == ", JSON.parse(dat))
    console.log("game_controller.force_actions()")
    game_script_parser.script_parse(dat, function(data){
        console.log("==script_parse() result===", data)
        nowdata = data
        // for (var dat in data){
        //     actions_array.push(data[dat])
        // }
        actions_array.push(data)
        console.log("====== Script Result =======")
        console.log("==nowdata===", nowdata)
        write_to_port(console.log)
        // send_to_server(data)
        res.send("Query: \n"+dat + '\n' + "Processed: \n"+JSON.stringify(nowdata))
    })
    if (nowdata == "Failed Actions") return;
    // next()
}


exports.send_game_state_to_server = function(data){
	//replace # with %23 to stop error 500
	if(typeof data.data === "string"){
		data.data = data.data.replace("#", "%23")
		console.log("ISSTRING")
	}
	send_to_server(data)
    request.get(server_url+'status/game_state/'+JSON.stringify(data), { json: false }, (err, res, body) => {
		console.log("==========/////SENT TO SERVER game_controller.sendtoderver", JSON.stringify(data))
        if (err) { return console.log(err); }
        console.log("====== GAME STATE RESPONSE============================")
        console.log(body)
        console.log("======== Sent to Server ========");
      });
}

function write_to_port(callback){
    console.log("=====write_to_port()===== : ", actions_array[0])
    if (actions_array.length == undefined){
        if(!from_server) send_to_server(nowdata[0]);
    }
    else{
        console.log("actions_array", actions_array)
       if (!master_ready){
           callback('not ready')
           return
       }
        if (actions_array[0] == ""){
            callback("no message");  
            return
        }
        if (actions_array[0] == "Cannot Repeat"){
            callback('Cannot repeat');
            return
        }
        //possible place a delay here for the arduino to process
        serial.port_write(actions_array[0], function(msg){
            console.log(msg)
            actions_array.shift()
            master_ready = false
            // set_master_ready(false)
        })
        if(!from_server) send_to_server(actions_array[0]);
    }
    callback("complete")
}


function send_to_server(data, dest){
    if(typeof dest === 'undefined'){
	dest = 'messages/'
    }
    //UNCOMMENT BELOW TO SEND TO THE SERVER
    request.get(server_url+dest+JSON.stringify(data), { json: false }, (err, res, body) => {
      if (err) { return console.log(err); }
      console.log("RESPONSE============================")
      console.log(body)
      console.log("======== Sent to Server ========");
    });
}

function play_sound(file){
    // requires afplayer or something else, can only test on the pi
    console.log("playing sound")
    play.sound(`../assets/${file}`, function(){
        // these are all "fire and forget", no callback
        play.sound('../assets/test.mp3');
        play.sound('../assets/test.mp3');
  });
}


function isJson(str) {
    try {
        JSON.parse(str);
    } catch (e) {
        return false;
    }
    return true;
}

exports.actions_check = function(callback){
    if (actions_array[0] == undefined){
        return
    } 
    else {
        write_to_port(console.log)
        callback("action sent ")
    }
}

//////////////////////
/// TEST FUNCTIONS //
////////////////////

//function to test the server requests.
exports.test_out = function(req, res, next){

    
    var test_event = {
        "id"            :   "5",
        "name"          :   "start_game",
        "device_id"     :   "23",
        "event"         :   "toggle",
        "eventType"     :   "button",
        "data"          :   "6",
        "description"   :   "the beginning of the game, code typed or something",
        "dependencies"  :   [],
        "actions"       :   ["play_start_music", "open_door", "test_led", "test_led_off"],
        "message"       :   "started the game",
        "state"         :   "start_game"
    }
    test_event.room_name = "ex-revenge"
    send_to_server(test_event, "status/game_state/")
    res.send(test_event)
}