"use strict"
// import { request } from "https";

var game_script = require("../game_script.json")
const game_controller = require('./game_controller')
const serial = require('../routes/serial');
const delay = require('delay');
const request = require('request');
const game_config = require('../config/config.json')

var server_url = game_config.server_url
var room_name = game_config.room_name


request.get(server_url+'gs_json', { json: true }, (err, res, body) => {
    if (err) { return console.log("Could not update Game script", err); }
    console.log("===========Updated Script=================")
    console.log(body)
    game_script = body
  });

///////////////////////
/// Game state Vars///
/////////////////////
var game_state = new Array();
var completed_actions = new Array();
var non_repeatable_actions = new Array();

///////////////////////
/// Functions ////////
/////////////////////


//determine packet type
exports.script_parse = function(packet, callback){
	if(game_controller.from_server_check() == true){
		console.log("=====FROM SERVER=====",game_controller.from_server_check())
		var packet = find_event(packet)
		packet.fromId = packet.device_id
	}
	else{
		var packet = JSON.parse(packet)
		console.log("===scriptparser.script_parse NOT from server")
	}
    console.log("=============== PACKET =============")
    console.log(packet)
    //if it is an event
    if(packet.ready == "true"){
        game_controller.set_master_ready(true);
        //CHECK game_controller.actions_array
        game_controller.actions_check(console.log)
        callback("ready_msg")
        return
    } 
    else if(packet.eventType != "noneET"){
        this.events(packet, function(result){
			console.log("====EVENT CALLBACK===",result)
            callback(result)
        });
    }
    //if it is an action
    else{
        this.actions(packet, function(result){
            console.log("===========Actions callback==============")
            console.log(result)
            callback(result)
        })
    }
}


//parse event
exports.events = function(packet, callback){
    var actions_arr = new Array()
    var dependencies_ok = false;
    console.log("============EVENT=================")
    //loop through events
    for (var i = 0 ; i < game_script.events.length; i++){
        var evt = game_script.events[i]
        //find the matching event
        if ((evt.device_id == packet.fromId) && (evt.event == packet.event) && (arrays_equal(evt.data, packet.data) || evt.data == packet.data)){
            console.log("game_state: ", game_state)
            console.log("non_repeatable_actions: ", non_repeatable_actions)
            //dependencies are ok, change game state and do actions
            if (dependencies_check(evt) || game_controller.from_server_check){
                if (!game_state.indexOf(evt.state) !== -1){
                    game_state.push(evt.state)
                }
                else if(game_state.indexOf(evt.state) !== -1 && evt.can_toggle == "true"){
                    event_toggle(evt)
                }
                evt.room_name = room_name
                game_controller.send_game_state_to_server(evt)
				console.log("=============/////SENT TO SERVER", evt)
                if(evt.state == "end_game"){
                    game_state = new Array();
					console.log("ENDING GAME game_state:", game_state)
                }
                console.log("message :", evt.message)
                if(evt.actions.length > 0){
                    for (var j = 0 ; j < evt.actions.length; j++){
                        play_action(evt.actions[j], function(result){
                            actions_arr.push(result)
                        })
                    }
                    callback(actions_arr)
                }
            }
            
        }
    }
}

function arrays_equal(a, b) {
    console.log("array comapre")
    return JSON.stringify(a) == JSON.stringify(b);

}


//parse action

////////////////////////
// get the dependencies of the actions
// if they do not already exist on the list
// force update the game to there.
// or fire the events off in the dependencey list
// recursively go through the events to update game state- 
// ie all parent events
///////////////////////
exports.actions = function(packet, callback){
    //NOTE, 
    var actions_arr
    console.log("============ACTION=================")
    console.log(packet.fromId, packet.action, packet.actionType, packet.data)
    for (var i = 0 ; i < game_script.actions.length; i++){
        var act = game_script.actions[i]
        //find the matching event
        //maybe just send the action name from the server and parse it here....
        if ((act.device_id == packet.toId) && (act.action == packet.action) && (act.data == packet.data) && (act.name == packet.name)){
            console.log(act.message)
            if (act.dependencies.length != 0){
                force_action(act, function(result){
                    actions_arr = result
                    console.log("====Forced actions=====")
                    console.log("actions_arr= ", actions_arr)
                    callback(actions_arr)
                })
            }
            else{
                play_action(act.name, function(result){
                actions_arr = result
                callback(actions_arr)
            })
            }
        }
    }
    // callback(actions_arr)
}

exports.gs_update = function(req, res){
    request.get(server_url+'gs_json', { json: true }, (err, res, body) => {
    if (err) { return console.log("Could not update Game script", err); }
    console.log("===========Updated Script=================")
    console.log(body)
    game_script = body
    res.send("Updated script"+game_script)
  });
}


//////////////////////////
// FORCE_ACTION
// forces the dependencies of all actions to be completed
//////////////////////////
function force_action(obj, callback){
    var actions_to_complete = new Array();
    console.log("DEPECNDENCIES : ", obj.dependencies)
    if (obj.dependencies.length < 1 || !obj.dependencies){
        callback("no dependencies")
        return
    }
    for (var i = 0 ; i < obj.dependencies.length; i ++){
        var dep = obj.dependencies[i]
        if (!non_repeatable_actions.indexOf(dep) !== -1){
            console.log("dependencey name: ", dep)
            play_action(dep, function(data){
                actions_to_complete.push(data)
            })
        }
    }
    callback(actions_to_complete)
}


//get action ready to send
function play_action(action, callback){
    var act = game_script.actions
    console.log("======= play_action() ===========")
    console.log("=======Checking Action Dependencies ======")
    console.log(action)
    for (var i = 0 ; i < act.length ; i++){
        if (act[i].name == action){
            if(act[i].dependencies.length > 0){
                if (!dependencies_check(act[i])){
                    callback("Dependencies not met") 
                    return console.log("Dependencies not met for acitons..")
                }
            }
            let result = {
                "fromId"        : Number(game_script.masterId),
                "toId"          : Number(act[i].device_id),
		        "wait"  		: act[i].wait,
                "event"         : act[i].event,
                "eventType"     : act[i].eventType,
                "action"        : act[i].action,
                "actionType"    : act[i].actionType,
                "data"          : act[i].data
            }  
            if(act[i].repeatable == "true"){
                callback(result)
                return
            }
            
            if(non_repeatable_actions.indexof(act[i].name) !== -1){
                result = "Cannot Repeat";
                callback(result)
                return
            }
            if(act[i].repeatable == "false" && !non_repeatable_actions.indexof(act[i].name) !== -1){
                non_repeatable_actions.push(act[i].name)
                console.log("pushed non_repeatable_actions()")
                callback(result)
                return
            }
        }
    }
    console.log("play_action ===CANNOT FIND===")
    
    
}

/////////////////////////////////////
// DEPENDENCIES CHECK
// ensures all prerequisites have been completed
/////////////////////////////////////
function dependencies_check(obj){
    console.log("======== dependencies_check() ========")
    var dependencies_ok;
    if(obj.dependencies.length > 0){
        for (var x = 0 ; x < obj.dependencies.length; x++){
                if (game_state.indexOf(obj.dependencies[x]) !== -1){
                    dependencies_ok = true;
                    console.log("dependencies met: ", obj.dependencies[x])
                }
                else{
                    dependencies_ok = false;
                    console.log("===== All Dependencies not met ====")
                    break;
                }
            }
        }
    else{
        dependencies_ok = true;
    }
    if (dependencies_ok) console.log("===== All Dependencies met ====");
    return dependencies_ok
}


//for finding event by name
function find_event(event_name){
	console.log("==FINDING event by name===")
	for(var i = 0 ; i < game_script.events.length ; i++){
		if (game_script.events[i].name == event_name){
			return game_script.events[i]
		}
	}
}



//////////////////////////////////////////////////
// EVENT TOGGLE
// Removes event from game state if it can be done more than once
// ie. 4 objects must be placed and can be switched around
////////////////////////////////////////////////
function event_toggle(obj){
    console.log("==== event_toggle() =====")
    console.log("game_state = ", game_state)
    if (game_state.indexOf(obj.name) !== -1){
        var index = game_state.indexOf(obj.name)
        if (index != -1) {game_state.splice(index, 1)}
    }
        console.log("new game_state = ", game_state)
}
