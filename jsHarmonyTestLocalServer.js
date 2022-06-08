/*
Copyright 2022 apHarmony

This file is part of jsHarmony.

jsHarmony is free software: you can redistribute it and/or modify
it under the terms of the GNU Lesser General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

jsHarmony is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU Lesser General Public License for more details.

You should have received a copy of the GNU Lesser General Public License
along with this package.  If not, see <http://www.gnu.org/licenses/>.
*/

var _ = require('lodash');
var async = require('async');
var path = require('path');
var spawn = require('child_process').spawn;
var urlparser = require('url');
var net = require('net');

function jsHarmonyTestLocalServer(_jsh) {
  
  this.jsh = _jsh;
  if(_jsh) this.platform = _jsh;
  else{
    this.platform = {
      Config: {
        app_name: '',
        error_email: '',
      },
      SendEmail: function(mparams, cb){ if(cb) cb(); },
    };
  }

  this.processes = [];
  this.commandLog = [];
  this.MAX_LOG_LENGTH = 100;
}

jsHarmonyTestLocalServer.prototype.executeCommands = function(commands, cb) {
  var _this = this;
  async.series(_.map(commands, function(command) {
    return function(item_cb) {_this.executeCommand(command, item_cb);};
  }), cb);
};

jsHarmonyTestLocalServer.prototype.executeCommand = function(command, cb) {
  if (typeof(command) == 'function') {
    command(this.jsh, cb);
  } else if (typeof(command) == 'object') {
    this.executeShell(command, cb);
  } else {
    this.jsh.Log.error('unknown command type', typeof(command));
    cb('Unknown command type');
  }
};

jsHarmonyTestLocalServer.prototype.executeShell = function(command, command_cb) {
  var cwd = command.cwd;
  var _this = this;
  if(!cwd) cwd = process.cwd();
  if(!path.isAbsolute(cwd)) cwd = path.join(process.cwd(), cwd);

  function appendLog(txt){
    if(!txt) return;
    txt = txt.toString();
    _this.commandLog.push(txt);
    if(_this.commandLog.length > _this.MAX_LOG_LENGTH) _this.commandLog.shift();
  }

  var hasError = false;
  appendLog('Starting '+JSON.stringify(command));
  var cmd = spawn(command.path, command.params || [], { cwd: cwd });
  cmd.stdout.on('data', function(data){ appendLog(data); });
  cmd.stderr.on('data', function(data){ appendLog(data); });
  cmd.on('message', function(data){ appendLog(data); });
  cmd.on('error', function(err){
    if(hasError) return;
    hasError = true;
    if (command_cb) return command_cb(err);
  });
  cmd.on('close', function(){
    _.remove(this.processes, function(p) {return p == cmd;});
    if(hasError) return;
    if (command_cb) return command_cb();
  });
  this.processes.push(cmd);
};

jsHarmonyTestLocalServer.prototype.close = function(cb) {
  _.forEach(this.processes, function(cmd) {
    cmd.kill();
  });
  this.processes = [];
  cb();
};

jsHarmonyTestLocalServer.prototype.waitForServerReady = function(url, loadTimeout, cb) {
  var urlparts = urlparser.parse(url, true);
  if (!urlparts.port) {
    if (url.substring(0, 6) == 'https:') { urlparts.port = 443; }
    else urlparts.port = 80;
  }

  this.jsh.Log.info('Initializing and waiting for server to accept connections on ' + url);

  var endTime = new Date().getTime() + (loadTimeout || 30) * 1000;
  this.tryConnect({host: urlparts.hostname, port: urlparts.port, timeout: 1000}, endTime, cb);
};

jsHarmonyTestLocalServer.prototype.tryConnect = function(args, endTime, cb) {
  var _this = this;
  var curTime = new Date().getTime();
  var completed = false;
  var socket = net.connect(args, function() {
    if(completed) return;
    completed = true;
    socket.end();
    if (cb) cb();
    cb = null;
  });
  socket.on('error', function(err) {
    if(completed) return;
    completed = true;
    socket.end();
    if ((err.code == 'ENOTFOUND' || err.code == 'ECONNREFUSED') && curTime < endTime) {
      setTimeout(function(){ _this.tryConnect(args, endTime, cb); }, 250);
    } else {
      var errmsg = err.toString();
      if(_this.commandLog.length){
        errmsg += '\r\n' + 'Last Log:';
        for(var i=0;i<_this.commandLog.length;i++){
          errmsg += '\r\n' + _this.commandLog[i];
        }
      }
      _this.jsh.Log.error(errmsg);
      if (cb) cb(err);
    }
  });
};

module.exports = exports = jsHarmonyTestLocalServer;

