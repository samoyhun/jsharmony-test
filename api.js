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

var jsHarmonyTest = require('./jsHarmonyTest.js');
var path = require('path');
var async = require('async');

function jsHarmonyTestAPI(options){
  this.silent = options.silent;
  this.show_browser = options.show_browser;
  var appbasepath = options.appbasepath || path.join(process.cwd(), 'test/app');
  var datadir = options.datadir || path.join(appbasepath, '/data/');
  //Load Config
  var jsh = this.jsh = new jsHarmonyTest.Application();
  jsh.Config.appbasepath = appbasepath;
  jsh.Config.datadir = datadir;
  jsh.Config.silentStart = true;
  jsh.Config.interactive = true;
  jsh.Config.onConfigLoaded.push(function(cb){
    jsh.Config.system_settings.automatic_schema = false;
    jsh.Extensions.report = require('jsharmony-report');
    jsh.Extensions.image = require('jsharmony-image-magick');
    return cb();
  });

  var jst = jsh.Modules['jsHarmonyTest'];
  if (jst) {
    if (options.configPath) jst.Config.LoadJSONConfigFile(jsh, path.resolve(options.configPath));
    else jst.Config.LoadJSONConfigFolder(jsh, path.resolve('test/screenshots'));
  }
}

jsHarmonyTestAPI.prototype.Init = function(cb){
  var _this = this;
  _this.jsh.Init(function(){
    if(cb) return cb();
  });
};

jsHarmonyTestAPI.prototype.recorder = function(options, cb){
  var testRecorder = new (require('./jsHarmonyTestRecorder'))(this, options);
  return testRecorder.Run(options, cb);
};

jsHarmonyTestAPI.prototype.generateMaster = function(cb){
  var jst = this.jsh.Modules['jsHarmonyTest'];
  var settings = jst ? jst.Config : {};
  var silent = this.silent;
  var server = new (require('./jsHarmonyTestLocalServer'))(this.jsh);
  var curtest = new (require('./jsHarmonyTestScreenshot'))(this.jsh, settings, 'test/screenshots', path.join(this.jsh.Config.datadir, 'jsharmony-test/screenshots'));
  curtest.show_browser = this.show_browser;

  var onLoad = settings.onLoad || [{ 'exec': 'shell', 'path': 'node', 'params': ['app.js'], 'cwd': process.cwd() }];
  server.executeCommands(onLoad);
  
  async.waterfall([
    function(net_cb) { server.waitForServerReady(settings.server, settings.loadTimeout || 30, net_cb); },
    function(test_cb) { curtest.generateMaster(test_cb); },
    function(open_cb) { if (silent) open_cb(); else openDocument(curtest.reviewFilePath(), open_cb); }
  ], function(err) {
    if (err) process.exitCode = 1;
    server.close(cb);
  });
};

jsHarmonyTestAPI.prototype.runComparison = function(cb){
  var jst = this.jsh.Modules['jsHarmonyTest'];
  var settings = jst ? jst.Config : {};
  var silent = this.silent;
  var server = new (require('./jsHarmonyTestLocalServer'))(this.jsh);
  var curtest = new (require('./jsHarmonyTestScreenshot'))(this.jsh, settings, 'test/screenshots', path.join(this.jsh.Config.datadir, 'jsharmony-test/screenshots'));
  curtest.show_browser = this.show_browser;

  var onLoad = settings.onLoad || [{ 'exec': 'shell', 'path': 'node', 'params': ['app.js'], 'cwd': process.cwd() }];
  server.executeCommands(onLoad);
  
  async.waterfall([
    function(net_cb) { server.waitForServerReady(settings.server, settings.loadTimeout || 30, net_cb); },
    function(test_cb) { curtest.runComparison(test_cb); },
    function(failCount, count_cb) {
      if (failCount) process.exitCode = 1;
      count_cb();
    },
    function(open_cb) {
      if (silent){ open_cb(); }
      else{ openDocument(curtest.resultFilePath(), open_cb); }
    },
  ], function(err) {
    if (err) process.exitCode = 1;
    server.close(cb);
  });
};

function getCommandLine() {
  switch (process.platform) {
    case 'darwin' : return 'open';
    case 'win32' : return 'start';
    default : return 'xdg-open';
  }
}

function openDocument(path, cb) {
  var exec = require('child_process').exec;
  exec(getCommandLine() + ' ' + path);
  cb();
}

module.exports = exports = jsHarmonyTestAPI;