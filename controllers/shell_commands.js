const shell = require('shelljs');


// exports.git_update = fucntion(req, res){
//     shell.exec(`git pull`, function(code, stdout, stderr) {
//         console.log('Exit code:', code);
//         console.log('Program output:', stdout);
//         console.log('Program stderr:', stderr);
//         res.send(stdout)
//       });
// }
exports.update = function(req, res){
    var cmd = 'cd /home/pi/Desktop/game-controller && git pull'
    command(cmd, function(dat){
        res.send(dat)
    })
}



exports.reboot_now = function(req, res){
    var cmd = 'sudo reboot now'
    command(cmd, function(dat){
        res.send(dat)
    })
}



exports.custom_command = function(req, res){
    var cmd = req.params.cmd
    command(cmd, function(dat){
        res.send(dat)
    })
}


function command(cmd, callback){
    shell.exec(`${cmd}`, function(code, stdout, stderr) {
        console.log('Exit code:', code);
        console.log('Program output:', stdout);
        console.log('Program stderr:', stderr);
        callback(stdout)
      });
}