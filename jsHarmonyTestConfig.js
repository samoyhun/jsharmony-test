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

var jsHarmonyConfig = require('jsharmony/jsHarmonyConfig');
var path = require('path');

function jsHarmonyTestConfig(){
  this.moduledir = path.dirname(module.filename);
  this.forDB = {};

  this.server = null; // leave blank so we can know whether to sub in the system port later
  this.loadTimeout = 30; // seconds

  this.testOnly = [];
  this.screenshotOnly = [];
  this.additionalTestSearchPaths = [
    //{"group": "some-module", "path": "C:\wk\some-module\test\screenshots"},
  ],
  this.onLoad = null; // run the default command
  // [], // testing external server
  // [{ "exec": "shell", "path": "node", "params": ["app.js"], "cwd": "..." }],  // run the server before testing

  this.variables = {};

  this.base_screenshot = {
    // "url": "",  // must be provided from config file should not be included here
    // "batch": 0,
    // "x": 0,
    // "y": 0,
    // "width": 950,
    // "height": 700,
    // "beforeScreenshot": "",  // Server-side JS code
    // "onload": "", // In-browser JS code
    // "cropToSelector": "", // .C_ID
    // "postClip": {},
    // "postClip":   {
    //   "x": 1,
    //   "y": 1,
    //   "width": 1,
    //   "height": 1
    // },
    // "trim": true, // true | false
    // "exclude": []
    // "exclude": [
    //   {
    //     "x": 1,
    //     "y": 1,
    //     "width": 1,
    //     "height": 1
    //   },
    //   {
    //     "selector": ""
    //   }
    // ]
    // }
  };
}

jsHarmonyTestConfig.prototype = new jsHarmonyConfig.Base();

jsHarmonyTestConfig.prototype.LoadJSONConfigFolder = function(jsh, fpath, sourceModule){
  jsHarmonyConfig.prototype.LoadJSONConfigFolder.call(this, jsh, fpath, sourceModule);
};

jsHarmonyTestConfig.prototype.LoadJSONConfigFile = function(jsh, fpath, sourceModule, dbDriver){
  jsHarmonyConfig.prototype.LoadJSONConfigFile.call(this, jsh, fpath, sourceModule, dbDriver);
};


exports = module.exports = jsHarmonyTestConfig;