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
var path = require('path');

//  Parameters:
//    _base_url: server address the test will run against
//    _id: id of test
//    _screenshotDir
//    _jsh: jsharmony, used for image processing, and js commands

function jsHarmonyTestRun(_base_url,_id,_screenshotDir, _jsh){
  this.base_url = _base_url;
  this.id = _id;
  this.screenshotDir = _screenshotDir;
  this.jsh = _jsh;

  this.page = null;
  this.testWarnings = [];
  this.testErrors = [];
}

// text selectors
function textContainsString(element, text) {
  var el = document.querySelector(element);
  return el && el.textContent.includes(text);
}

var textSelectors = {
  equals: function textEquals(element, text) {
    var el = document.querySelector(element);
    if (text.case == 'insensitive') {
      return el && el.textContent.toLowerCase() == text.equals.toLowerCase();
    } else {
      return el && el.textContent == text.equals;
    }
  },
  not_equals: function textNotEquals(element, text) {
    var el = document.querySelector(element);
    if (text.case == 'insensitive') {
      return el && el.textContent.toLowerCase() != text.not_equals.toLowerCase();
    } else {
      return el && el.textContent != text.not_equals;
    }
  },
  contains: function textContains(element, text) {
    var el = document.querySelector(element);
    if (text.case == 'insensitive') {
      return el && el.textContent.toLowerCase().includes(text.contains.toLowerCase());
    } else {
      return el && el.textContent.includes(text.contains);
    }
  },
  not_contains: function textNotContains(element, text) {
    var el = document.querySelector(element);
    if (text.case == 'insensitive') {
      return el && !el.textContent.toLowerCase().includes(text.not_contains.toLowerCase());
    } else {
      return el && !el.textContent.includes(text.not_contains);
    }
  },
  begins_with: function textBeginsWith(element, text) {
    var el = document.querySelector(element);
    if (text.case == 'insensitive') {
      return el && el.textContent.toLowerCase().startsWith(text.begins_with.toLowerCase());
    } else {
      return el && el.textContent.startsWith(text.begins_with);
    }
  },
  ends_with: function textEndsWith(element, text) {
    var el = document.querySelector(element);
    if (text.case == 'insensitive') {
      return el && el.textContent.toLowerCase().endsWith(text.ends_with.toLowerCase());
    } else {
      return el && el.textContent.endsWith(text.ends_with);
    }
  },
  regex: function textRegex(element, text) {
    var el = document.querySelector(element);
    return el && el.textContent.match(new RegExp(text.regex, text.case == 'insensitive' ? 'i' : ''));
  },
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

// value getters
async function getValue(valueGetter, page) {
  if (typeof(valueGetter.element) != 'string') return {errors: ['value missing element']};
  if (typeof(valueGetter.property) != 'string') return {errors: ['value missing property']};
  if (valueGetter.regex && typeof(valueGetter.regex) != 'string') return {errors: ['value regex must be a string']};

  var regex;
  if (valueGetter.regex) {
    regex = new RegExp(valueGetter.regex);
  }

  var property = valueGetter.property;
  if (property == 'text') property = 'textContent';
  console.log(valueGetter);
  var value = await page.$eval(valueGetter.element, function(el, property) {return el[property]}, property);

  if (regex) {
    var result = regex.exec(value);
    if (result && result.length) {
      return {value: result[1]};
    } else {
      return {errors: ['value regex failed to match']};
    }
  } else {
    return {value: value};
  }
}

function substituteVariables(variables, value) {
  if (!(typeof(value) == 'string' && value.match('@'))) return value;

  for (var name in variables) {
    value = value.replace(new RegExp('@'+name, 'g'), variables[name]);
  }

  return value;
}

jsHarmonyTestRun.commands = [
  'navigate',
  'screenshot',
  'wait',
  'input',
  'click',
  'set',
  'js',
  'assert',
];

jsHarmonyTestRun.prototype.command_navigate = async function(command, page, variables) {
  if (typeof(command.url) != 'string') return {errors: ['navigate missing url']};
  var fullurl = substituteVariables(variables, new URL(command.url, this.base_url).toString());
  this.jsh.Log.info(fullurl);
  var resp = await page.goto(fullurl);
  if (resp._status <='304'){
    return {};
  } else {
    return {errors: ['navigation failed ' + fullurl]};
  }
};

jsHarmonyTestRun.prototype.command_screenshot = async function(command, page, variables) {
  if (typeof(command.id) != 'string') return {errors: ['screenshot missing id']};
  var screenshotSpec = jsHarmonyTestScreenshotSpec.fromJSON(command.id, command);
  var fname = screenshotSpec.generateFilename();
  var screenshotPath = path.join(this.screenshotDir, fname);
  await screenshotSpec.generateScreenshot(page, this.jsh, screenshotPath);
  return {
    errors: screenshotSpec.testErrors,
    warnings: screenshotSpec.testWarnings,
  };
};

jsHarmonyTestRun.prototype.command_wait = async function(command, page, variables) {
  if (command.element && typeof(command.element) != 'string') return {errors: ['wait element must be a string']};
  if (command.text && !(typeof(command.text) == 'string' || typeof(command.text) == 'object')) return {errors: ['wait text must be a string or text selector']};
  if (!command.element && !command.text) return {errors: ['wait command must have element and/or text to wait for']};
  var textSelector = getTextSelector(command.text);
  if (command.text && !textSelector) return {errors: ['wait text did not match a known text selector']};
  if (command.while_waiting && !_.isArray(command.while_waiting)) return {errors: ['while_waiting must be an array']};
  try {
    var waitCondition;
    if (command.element && !textSelector) {
      waitCondition = page.waitForSelector(command.element);
    } else if (textSelector) {
      waitCondition = page.waitForFunction(textSelector, {polling: 'mutation'},
        command.element || 'html', command.text);
    } else {
      return {errors: ['wait arguments did not evaluate to a wait condition']};
    }
    var result = await this.runCommandSeries(command.while_waiting || [], page, variables)
    await waitCondition;
    return result;
  } catch (e) {
    return {errors: [e]};
  }
};

jsHarmonyTestRun.prototype.command_input = async function(command, page, variables) {
  if (typeof(command.element) != 'string') return {errors: ['input missing element']};
  if (typeof(command.value) != 'string' && typeof(command.value) != 'boolean') return {errors: ['input missing value']};
  var value = substituteVariables(variables, command.value);
  try {
    // TODO
    // enter
    var type = await page.$eval(command.element, function(el) {return el.type});
    if (type == 'checkbox') {
      var value;
      if (value === true || value == 'true') value = true;
      else if (value === false || value == 'false') value = false;
      else return {errors: ['input checkbox invalid value']};
      await page.$eval(command.element, function(el, value) { el.checked = value; }, value);
    } else if (type == 'select-one') {
      await page.select(command.element, value);
    } else {
      await page.type(command.element, value);
    }
  } catch(e) {
    return {errors: [e]};
  }
  return {};
};

jsHarmonyTestRun.prototype.command_click = async function(command, page, variables) {
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

jsHarmonyTestRun.prototype.command_set = async function(command, page, variables) {
  if (typeof(command.variable) != 'string') return {errors: ['set missing variable']};
  if (typeof(command.value) != 'object') return {errors: ['set missing value']};
  try {
    var got = await getValue(command.value, page);
    if (got.errors) return got;
    variables[command.variable] = got.value;
    this.jsh.Log.info(command.variable + ' = ' + got.value);
  } catch(e) {
    return {errors: [e]};
  }
  return {};
};

function parseHandler(jsh, handler, args, desc, scriptPath) {
  if (_.isArray(handler)) handler = handler.join('');
  return jsh.createFunction(handler, args, desc, scriptPath);
}

jsHarmonyTestRun.prototype.command_js = async function(command, page, variables) {
  if (typeof(command.js) != 'string' && !_.isArray(command.js)) return {errors: ['js missing js code']};
  try {
    var func_command = parseHandler(this.jsh, command.js, ['jsh', 'page', 'cb'], 'command', this.sourcePath);
    var callbackValue;
    await new Promise(async function(resolve) {
      var result = func_command(this.jsh,page,function(ret) {
        callbackValue = ret; resolve();
      });
      if (result && result.then) {
        try {await result;}
        catch (e) {callbackValue = e;}
        resolve();
      }
      // else wait on the callback.
    });
    if (callbackValue) {
      return {errors: [callbackValue]};
    } else {
      return {};
    }
  } catch(e) {
    return {errors: [e]};
  }
  return {};
};

jsHarmonyTestRun.prototype.command_assert = async function(command, page, variables) {
  if (command.element && typeof(command.element) != 'string') return {errors: ['assert element must be a string']};
  if (command.text && !(typeof(command.text) == 'string' || typeof(command.text) == 'object')) return {errors: ['assert text must be a string or text selector']};
  if (command.error && !typeof(command.error) == 'string') return {errors: ['assert error must be a string']};
  if (!command.element && !command.text) return {errors: ['assert command must have element and/or text check for']};
  var textSelector = getTextSelector(command.text);
  if (command.text && !textSelector) return {errors: ['assert text did not match a known text selector']};
  try {
    if (command.element && !textSelector) {
      if (!await page.$eval(command.element, function(el) {return true;})) {
        return {errors: [command.error || ('assert: ' + command.element + ' not found')]};
      }
    } else if (textSelector) {
      if (!await page.evaluate(textSelector, command.element || 'html', command.text)) {
        return {errors: [command.error || ('assert: ' + (command.element || 'html') + ' did not match the text selector')]};
      }
    } else {
      return {errors: ['assert arguments did not evaluate to a test condition']};
    }
  } catch (e) {
    return {errors: [e]};
  }
  return {};
};

jsHarmonyTestRun.prototype.runCommand = async function (command, page, variables) {
  if (jsHarmonyTestRun.commands.indexOf(command.exec) != -1) return this['command_'+command.exec](command, page, variables);
  else return { errors: ['Unknown command: ' + command.exec] };
}

jsHarmonyTestRun.prototype.runCommandSeries = async function (commands, page, variables) {
  if (!commands || commands.length < 1) return {warnings: [], errors: []};

  var _this = this;
  let results = [];

  try {
    for (var i = 0;i < commands.length;i++) {
      results.push(await _this.runCommand(commands[i], page, variables));
    }
  } catch (e) {
    results.push({errors: [e]});
  }

  return {
    warnings: results.flatMap(function(res) { return res.warnings || [] }),
    errors: results.flatMap(function(res) { return res.errors || [] }),
  };
}

jsHarmonyTestRun.prototype.run = async function (commands, variables) {
  var _this = this;
  let results = [];

  let result = await this.runCommandSeries(commands, this.page, variables);

  result.warnings.forEach(function(w) { _this.testWarnings.push(w) });
  result.errors.forEach(function(e) { _this.testErrors.push(e) });
}

//Setup to run commands
// We expect this to be run on only once per object, but allow the timing to be different from object creation because of puppeteer operations.
jsHarmonyTestRun.prototype.begin = async function (browser, cb) {
  if (!browser) {
    if (cb) return cb(new Error('no browser available, Please configure jsh.Extensions.report'));
    else return;
  }
  this.testWarnings = [];
  this.testErrors = [];
  try {
    this.page = await browser.newPage();
    this.page.setDefaultTimeout(5000);
    if(cb) return cb();
  } catch (e) {
    this.testErrors = [e];
    if (this.page) await this.page.close();
    delete this.page;
    if(cb) return cb(e);
  }
};

jsHarmonyTestRun.prototype.end = async function (cb) {
  try {
    if (this.page) await this.page.close();
    delete page;
  } catch(e) {
    delete page;
    this.testErrors.push(e);
    if (cb) return cb(e);
  }
};

module.exports = exports = jsHarmonyTestRun;