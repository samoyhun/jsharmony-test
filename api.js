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
var fs = require('fs');
var async = require('async');

function jsHarmonyTestAPI(options){
  this.silent = options.silent;
  this.show_browser = options.show_browser;
  var testFolderPath = this.testFolderPath = path.resolve(options.testFolderPath || process.cwd());
  //Load Config
  var jsh = this.jsh = new jsHarmonyTest.Application();
  jsh.Config.silentStart = true;
  jsh.Config.interactive = true;

  var appbasepath = options.appbasepath || testFolderPath;
  var datadir = options.datadir || path.resolve(appbasepath, 'data');
  var configbasepath = testFolderPath;

  var jst = jsh.Modules['jsHarmonyTest'];
  if (jst) {
    if (options.configPath) {
      jst.Config.LoadJSONConfigFile(jsh, path.resolve(options.configPath));
      configbasepath = path.dirname(options.configPath);
    }
    else {
      jst.Config.LoadJSONConfigFolder(jsh, testFolderPath);
      configbasepath = testFolderPath;
    }

    if (jst.Config.appbasepath && !options.appbasepath) {
      appbasepath = path.resolve(configbasepath, jst.Config.appbasepath);
    }
    if (jst.Config.datadir) {
      datadir = options.datadir || path.resolve(configbasepath, jst.Config.datadir);
    } else {
      datadir = options.datadir || path.resolve(appbasepath, 'data');
    }
  }

  if (!datadir.endsWith(path.sep)) datadir = datadir + path.sep;

  jsh.Config.appbasepath = appbasepath;
  jsh.Config.datadir = datadir;
}

function onConfigLoaded(jsh) {
  jsh.Config.system_settings.automatic_schema = false;
  jsh.Extensions.report = require('jsharmony-report');
  jsh.Extensions.image = require('jsharmony-image-magick');
}

jsHarmonyTestAPI.prototype.Init = function(cb){
  // no point in logging to error - this will crash when attemping to write to the logfile anyway
  if (!fs.existsSync(this.jsh.Config.appbasepath)) throw new Error('appbasepath "' + this.jsh.Config.appbasepath + '" does not exist. This likely means jsHarmonyTest was run on the wrong directory, or you have a typo in the configuration file.');
  if (!fs.existsSync(this.jsh.Config.datadir)) throw new Error('datadir "' + this.jsh.Config.datadir + '" does not exist. Either jsHarmonyTest has been run on the wrong base directory, or you need to create the data directory.');
  this.jsh.Config.Init();
  onConfigLoaded(this.jsh);

  if(cb) return cb();
};

jsHarmonyTestAPI.prototype.recorder = function(options, cb){
  var testRecorder = new (require('./jsHarmonyTestRecorder'))(this, options);
  return testRecorder.Run(options, cb);
};

jsHarmonyTestAPI.prototype.jsHarmonyTestScreenshot = function(settings){
  var curtest = new (require('./jsHarmonyTestScreenshot'))(this.jsh, settings, this.testFolderPath, path.join(this.jsh.Config.datadir, 'jsharmony-test/screenshots'));
  curtest.show_browser = this.show_browser;
  return curtest;
};

jsHarmonyTestAPI.prototype.generateMaster = function(cb){
  var jst = this.jsh.Modules['jsHarmonyTest'];
  var settings = jst ? jst.Config : {};
  var silent = this.silent;
  var server = new (require('./jsHarmonyTestLocalServer'))(this.jsh);
  var curtest = this.jsHarmonyTestScreenshot(settings);

  var onLoad = settings.onLoad || [{ 'exec': 'shell', 'path': 'node', 'params': ['app.js'], 'cwd': this.jsh.Config.appbasepath }];
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
  var curtest = this.jsHarmonyTestScreenshot(settings);

  var onLoad = settings.onLoad || [{ 'exec': 'shell', 'path': 'node', 'params': ['app.js'], 'cwd': this.jsh.Config.appbasepath }];
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