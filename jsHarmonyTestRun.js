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
//    _jsh: jsharmony, used for image processing, and js commands
//    _screenshotConfig: {
//      id: test id, string included in screenshot filenames
//      path: screenshot base output path
//      screenshot: screenshot properties object included in all screenshots
//    }

function jsHarmonyTestRun(_server,_jsh, _screenshotConfig){
  this.server = _server;
  this.screenshotConfig = _screenshotConfig;
  this.jsh = _jsh;

  this.page = null;
  this.testWarnings = [];
  this.testErrors = [];
  this.screenshots = [];
}

function CommandError(message, command) {
  this.message = message;
  this.command = command;
  // Use V8's native method if available, otherwise fallback
  if ('captureStackTrace' in Error)
    Error.captureStackTrace(this, this.constructor);
  else
    this.stack = (new Error()).stack;
}

CommandError.prototype = Object.create(Error.prototype);
CommandError.prototype.name = 'CommandError';
CommandError.prototype.constructor = CommandError;

jsHarmonyTestRun.CommandError = CommandError;

function asError(message, command) {
  if (message instanceof Error) {
    message.command = command;
    return {errors: [message]};
  } else {
    return {errors: [new CommandError(message, command)]};
  }
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
  if (typeof(valueGetter.element) != 'string') return asError('value missing element', valueGetter);
  if (typeof(valueGetter.property) != 'string') return asError('value missing property', valueGetter);
  if (valueGetter.regex && typeof(valueGetter.regex) != 'string') return asError('value regex must be a string', valueGetter);

  var regex;
  if (valueGetter.regex) {
    regex = new RegExp(valueGetter.regex);
  }

  var property = valueGetter.property;
  if (property == 'text') property = 'textContent';
  var value = await page.$eval(valueGetter.element, function(el, property) {return el[property];}, property);

  if (regex) {
    var result = regex.exec(value);
    if (result && result.length) {
      return {value: result[1]};
    } else {
      return asError('value regex failed to match', valueGetter);
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
  if (typeof(command.url) != 'string') return asError('navigate missing url', command);
  var fullurl = substituteVariables(variables, new URL(command.url, this.server).toString());
  this.jsh.Log.info(fullurl, {ext: 'test'});
  var resp = await page.goto(fullurl);
  if (resp._status <='304'){
    return {};
  } else {
    return asError('navigation failed ' + fullurl, command);
  }
};

jsHarmonyTestRun.prototype.command_screenshot = async function(command, page, variables) {
  if (typeof(command.id) != 'string') return asError('screenshot missing id', command);
  if (typeof(this.screenshotConfig) != 'object') return {warnings: ['screenshots no configured']};
  if (typeof(this.screenshotConfig.id) != 'string') return {warnings: ['screenshot config missing test id']};
  if (typeof(this.screenshotConfig.path) != 'string') return {warnings: ['screenshot config missing output path']};
  var obj = _.extend({}, this.screenshotConfig.screenshot, command);
  var screenshotSpec = jsHarmonyTestScreenshotSpec.fromJSON(obj);
  var fname = screenshotSpec.generateFilename(this.screenshotConfig.id + '_' + command.id);
  var screenshotPath = path.join(this.screenshotConfig.path, fname);
  await screenshotSpec.generateScreenshot(page, this.jsh, screenshotPath);
  _.forEach(screenshotSpec.testErrors, function(err) {err.command = command;});
  return {
    errors: screenshotSpec.testErrors,
    warnings: screenshotSpec.testWarnings,
    screenshots: [{path: screenshotPath, filename: fname}],
  };
};

jsHarmonyTestRun.prototype.command_wait = async function(command, page, variables) {
  if (command.element && typeof(command.element) != 'string') return asError('wait element must be a string', command);
  if (command.text && !(typeof(command.text) == 'string' || typeof(command.text) == 'object')) return asError('wait text must be a string or text selector', command);
  if (!command.element && !command.text) return asError('wait command must have element and/or text to wait for', command);
  var textSelector = getTextSelector(command.text);
  if (command.text && !textSelector) return asError('wait text did not match a known text selector', command);
  if (command.while_waiting && !_.isArray(command.while_waiting)) return asError('while_waiting must be an array', command);
  try {
    var waitCondition;
    if (command.element && !textSelector) {
      waitCondition = page.waitForSelector(command.element);
    } else if (textSelector) {
      waitCondition = page.waitForFunction(textSelector, {polling: 'mutation'},
        command.element || 'html', command.text);
    } else {
      return asError('wait arguments did not evaluate to a wait condition', command);
    }
    var result = await this.runCommandSeries(command.while_waiting || [], page, variables);
    await waitCondition;
    return result;
  } catch (e) {
    return asError(e, command);
  }
};

jsHarmonyTestRun.prototype.command_input = async function(command, page, variables) {
  if (typeof(command.element) != 'string') return asError('input missing element', command);
  if (typeof(command.value) != 'string' && typeof(command.value) != 'boolean') return asError('input missing value', command);
  var value = substituteVariables(variables, command.value);
  try {
    // TODO
    // enter
    var type = await page.$eval(command.element, function(el) {return el.type;});
    if (type == 'checkbox') {
      if (value === true || value == 'true') value = true;
      else if (value === false || value == 'false') value = false;
      else return asError('input checkbox invalid value', command);
      await page.$eval(command.element, function(el, value) { el.checked = value; }, value);
    } else if (type == 'select-one') {
      await page.select(command.element, value);
    } else {
      await page.type(command.element, value);
    }
  } catch(e) {
    return asError(e, command);
  }
  return {};
};

jsHarmonyTestRun.prototype.command_click = async function(command, page, variables) {
  if (typeof(command.element) != 'string') return asError('click missing element', command);
  if (command.button && typeof(command.button) != 'string') return asError('click button must be a string', command);
  var options = {};
  if (command.button) options.button = command.button;
  try {
    await page.click(command.element, options);
  } catch(e) {
    return asError(e, command);
  }
  return {};
};

jsHarmonyTestRun.prototype.command_set = async function(command, page, variables) {
  if (typeof(command.variable) != 'string') return asError('set missing variable', command);
  if (typeof(command.value) != 'object') return asError('set missing value', command);
  try {
    var got = await getValue(command.value, page);
    if (got.errors) return got;
    variables[command.variable] = got.value;
    this.jsh.Log.info(command.variable + ' = ' + got.value, {ext: 'test'});
  } catch(e) {
    return asError(e, command);
  }
  return {};
};

function parseHandler(jsh, handler, args, desc, scriptPath) {
  if (_.isArray(handler)) handler = handler.join('');
  return jsh.createFunction(handler, args, desc, scriptPath);
}

jsHarmonyTestRun.prototype.command_js = async function(command, page, variables) {
  if (typeof(command.js) != 'string' && !_.isArray(command.js)) return asError('js missing js code', command);
  try {
    var func_command = parseHandler(this.jsh, command.js, ['jsh', 'page', 'cb'], 'command', command.sourcePath);
    var callbackValue;
    await new Promise(function(resolve, reject) {
      var result = func_command(this.jsh,page,function(ret) {
        callbackValue = ret; resolve();
      });
      if (result && result.then) {
        return result.then(resolve, reject);
      }
      // else wait on the callback.
    });
    if (callbackValue) {
      return asError(callbackValue, command);
    } else {
      return {};
    }
  } catch(e) {
    return asError(e, command);
  }
};

jsHarmonyTestRun.prototype.command_assert = async function(command, page, variables) {
  if (command.element && typeof(command.element) != 'string') return asError('assert element must be a string', command);
  if (command.text && !(typeof(command.text) == 'string' || typeof(command.text) == 'object')) return asError('assert text must be a string or text selector', command);
  if (command.error && !typeof(command.error) == 'string') return asError('assert error must be a string', command);
  if (!command.element && !command.text) return asError('assert command must have element and/or text check for', command);
  var textSelector = getTextSelector(command.text);
  if (command.text && !textSelector) return asError('assert text did not match a known text selector', command);
  try {
    if (command.element && !textSelector) {
      if (!await page.$eval(command.element, function(el) {return true;})) {
        return asError(command.error || ('assert: ' + command.element + ' not found'), command);
      }
    } else if (textSelector) {
      if (!await page.evaluate(textSelector, command.element || 'html', command.text)) {
        return asError(command.error || ('assert: ' + (command.element || 'html') + ' did not match the text selector'), command);
      }
    } else {
      return asError('assert arguments did not evaluate to a test condition', command);
    }
  } catch (e) {
    return asError(e, command);
  }
  return {};
};

jsHarmonyTestRun.prototype.runCommand = async function (command, page, variables) {
  if (jsHarmonyTestRun.commands.indexOf(command.exec) != -1) return this['command_'+command.exec](command, page, variables);
  else return { errors: ['Unknown command: ' + command.exec] };
};

jsHarmonyTestRun.prototype.runCommandSeries = async function (commands, page, variables) {
  if (!commands || commands.length < 1) return {warnings: [], errors: [], screenshots: []};

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
    warnings: results.flatMap(function(res) { return res.warnings || []; }),
    errors: results.flatMap(function(res) { return res.errors || []; }),
    screenshots: results.flatMap(function(res) { return res.screenshots || []; }),
  };
};

jsHarmonyTestRun.prototype.run = async function (commands, variables) {
  var _this = this;

  let result = await this.runCommandSeries(commands, this.page, variables);

  result.warnings.forEach(function(w) { _this.testWarnings.push(w); });
  result.errors.forEach(function(e) { _this.testErrors.push(e); });
  result.screenshots.forEach(function(s) { _this.screenshots.push(s); });
};

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
    delete this.page;
  } catch(e) {
    delete this.page;
    this.testErrors.push(e);
    if (cb) return cb(e);
  }
};

module.exports = exports = jsHarmonyTestRun;