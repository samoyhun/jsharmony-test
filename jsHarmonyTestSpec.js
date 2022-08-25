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

var jsHarmonyTestScreenshotSpec = require('./jsHarmonyTestScreenshotSpec.js');
var _ = require('lodash');
var async = require('async');
var path = require('path');

//  Parameters:
//    _base_url: server address the test will run against
//    _id: id of test
function jsHarmonyTestSpec(_base_url,_id){
  this.base_url = _base_url;
  this.id = _id;       //id of test
  this.sourcePath; // path to the file that defined the test
  this.title = _id;
  this.batch = null;
  this.require = [];
  this.commands = [];

  this.importWarnings = [];
  this.testWarnings = [];
  this.testErrors = [];
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
//    base_url: target server address
//    id: id of test
//    obj: The JSON object
//Returns a jsHarmonyTestSpec object
jsHarmonyTestSpec.fromJSON = function(base_url, id, obj){
  let jsTS = new jsHarmonyTestSpec(base_url, id);
  let warnings = [];
  _.forEach(_.keys(obj), function(key) {
    if (!(key in allowedProperties)) {
      warnings.push('Unknown property [' + key + '] in test ' + id);
    }
  });

  const conf = _.extend({importWarnings: warnings},obj);
  _.assign(jsTS,conf);
  return jsTS;
};

function textContainsString(element, text) {
  var el = document.querySelector(element);
  return el && el.textContent.includes(text);
}

var textSelectors = {
  contains: function textContains(element, text) {
    var el = document.querySelector(element);
    return el && el.textContent.includes(text.contains);
  }
};

function getTextSelector(text) {
  if (!text) return;
  if (typeof(text) == 'string') return textContainsString;
  for (var sel in textSelectors) {
    if (sel in text) {
      return textSelectors[sel];
    }
  }
}

//Run the test commands
//  Parameters:
//    browser: A puppeteer Browser object
//    jsh: jsharmony, used for image processing, and beforeScreenshot, which can do... anything
//    screenshotDir: the path to the screenshot folder
//    cb: The callback function to be called on completion
jsHarmonyTestSpec.prototype.run = async function (browser, jsh, screenshotDir, cb) {
  if (!browser) {
    if (cb) return cb(new Error('no browser available, Please configure jsh.Extensions.report'));
    else return;
  }
  let _this = this;
  var page;
  this.testWarnings = [];
  this.testErrors = [];
  let results = [];
  try {
    page = await browser.newPage();
    page.setDefaultTimeout(5000);
    for (var i = 0;i < _this.commands.length;i++) {
      results.push(await _this.runCommand(_this.commands[i], page, jsh, screenshotDir));
    }
    await page.close();
    this.testWarnings = results.flatMap(function(res) { return res.warnings || [] });
    this.testErrors = results.flatMap(function(res) { return res.errors || [] });
    if(cb) return cb();
  }catch (e) {
    this.testWarnings = results.flatMap(function(res) { return res.warnings || [] });
    this.testErrors = results.flatMap(function(res) { return res.errors || [] });
    this.testErrors.push(e);
    if (page) page.close();
    if(cb) return cb(e);
  }
};

jsHarmonyTestSpec.prototype.runCommand = async function (command, page, jsh, screenshotDir) {
  if (jsHarmonyTestSpec.commands.indexOf(command.exec) != -1) return this['command_'+command.exec](command, page, jsh, screenshotDir);
  else return { errors: ['Unknown command: ' + command.exec] };
}

jsHarmonyTestSpec.commands = [
  'navigate',
  'screenshot',
  'wait',
  'input',
  'click',
];

jsHarmonyTestSpec.prototype.command_navigate = async function(command, page, jsh, screenshotDir) {
  if (typeof(command.url) != 'string') return {errors: ['navigate missing url']};
  var fullurl = new URL(command.url, this.base_url).toString();
  jsh.Log.info(fullurl);
  var resp = await page.goto(fullurl);
  if (resp._status <='304'){
    return {};
  } else {
    return {errors: ['navigation failed ' + fullurl]};
  }
};

jsHarmonyTestSpec.prototype.command_screenshot = async function(command, page, jsh, screenshotDir) {
  if (typeof(command.id) != 'string') return {errors: ['screenshot missing id']};
  var screenshotSpec = jsHarmonyTestScreenshotSpec.fromJSON(command.id, command);
  var fname = screenshotSpec.generateFilename();
  var screenshotPath = path.join(screenshotDir, fname);
  await screenshotSpec.generateScreenshot(page, jsh, screenshotPath);
  return {
    errors: screenshotSpec.testWarnings,
    warnings: screenshotSpec.testErrors,
  };
};

jsHarmonyTestSpec.prototype.command_wait = async function(command, page, jsh, screenshotDir) {
  if (command.element && typeof(command.element) != 'string') return {errors: ['wait element must be a string']};
  if (command.text && !(typeof(command.text) == 'string' || typeof(command.text) == 'object')) return {errors: ['wait text must be a string or text selector']};
  if (!command.element && !command.text) return {errors: ['wait command must have element and/or text to wait for']};
  var textSelector = getTextSelector(command.text);
  if (command.text && !textSelector) return {errors: ['wait text did not match a known text selector']};
  try {
    if (command.element && !textSelector) {
      await page.waitForSelector(command.element);
    } else if (textSelector) {
      await page.waitForFunction(textSelector, {polling: 'mutation'},
        command.element || 'html', command.text);
    } else {
      return {error: 'wait arguments did not evaluate to a wait condition'};
    }
  } catch (e) {
    return {errors: [e]};
  }
  // TODO "while_waiting": [ COMMAND, COMMAND ]  //Execute commands after initiating wait
  return {};
};

jsHarmonyTestSpec.prototype.command_input = async function(command, page, jsh, screenshotDir) {
  if (typeof(command.element) != 'string') return {errors: ['input missing element']};
  if (typeof(command.value) != 'string' && typeof(command.value) != 'boolean') return {errors: ['input missing value']};
  try {
    // TODO
    // enter
    // select-one
    // variables
    var type = await page.$eval(command.element, function(el) {return el.type});
    if (type == 'checkbox') {
      var value;
      if (command.value === true || command.value == 'true') value = true;
      else if (command.value === false || command.value == 'false') value = false;
      else return {errors: ['input checkbox invalid value']};
      await page.$eval(command.element, function(el, value) { el.checked = value; }, value);
    } else {
      await page.type(command.element, command.value);
    }
  } catch(e) {
    return {errors: [e]};
  }
  return {};
};

jsHarmonyTestSpec.prototype.command_click = async function(command, page, jsh, screenshotDir) {
  if (typeof(command.element) != 'string') return {errors: ['click missing element']};
  if (command.button && typeof(command.button) != 'string') return {errors: ['click button must be a string']};
  var options = {};
  if (command.button) options.button = command.button;
  try {
    await page.click(command.element, options);
  } catch(e) {
    return {errors: [e]};
  }
  return {};
};

module.exports = exports = jsHarmonyTestSpec;