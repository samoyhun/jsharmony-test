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

var jsHarmonyModule = require('jsharmony/jsHarmonyModule');
var jsHarmonyTestConfig = require('./jsHarmonyTestConfig');
var path = require('path');

function jsHarmonyTest(name){
  var _this = this;
  jsHarmonyModule.call(this, name);

  if(name) _this.name = name;
  _this.Config = new jsHarmonyTestConfig();
  _this.typename = 'jsHarmonyTest';
  _this.basepath = path.dirname(module.filename);
}

jsHarmonyTest.prototype = new jsHarmonyModule();

jsHarmonyTest.Application = function(name){
  return (new jsHarmonyTest(name)).Application();
};

module.exports = exports = jsHarmonyTest;
