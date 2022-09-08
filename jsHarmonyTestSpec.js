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

//  Parameters:
//    _id: id of test
function jsHarmonyTestSpec(_id, _sourcePath){
  this.id = _id;       //id of test
  this.sourcePath = _sourcePath; // path to the file that defined the test
  this.title = _id;
  this.batch = null;
  this.require = [];
  this.commands = [];

  this.importWarnings = [];
}

const allowedProperties = {
  'id': '',
  'title': '',
  'batch': '',
  'require': [],
  'commands': [],
};

//Parse a JSON object and return a jsHarmonyTestSpec object
//  Ensure the spec is correct and has no extra fields
//  Parameters:
//    id: id of test
//    obj: The JSON object
//Returns a jsHarmonyTestSpec object
jsHarmonyTestSpec.fromJSON = function(id, sourcePath, obj){
  let jsTS = new jsHarmonyTestSpec(id, sourcePath);
  let warnings = [];
  _.forEach(_.keys(obj), function(key) {
    if (!(key in allowedProperties)) {
      warnings.push('Unknown property [' + key + '] in test ' + id);
    }
  });

  const conf = _.extend({importWarnings: warnings},obj);
  _.assign(jsTS,conf);

  _.forEach(jsTS.commands, function(command) {
    command.sourcePath = sourcePath;
  });
  return jsTS;
};

module.exports = exports = jsHarmonyTestSpec;