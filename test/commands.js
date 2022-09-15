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

var jsHarmonyTest = require('../jsHarmonyTest.js');
var jsHarmonyTestRun = require('../jsHarmonyTestRun');
var report = require('jsharmony-report');
var image = require('jsharmony-image-magick');

var assert = require('assert');
var path = require('path');
var fs = require('fs');

async function getBrowser() {
  var browserParams = { ignoreHTTPSErrors: true, headless: false, ignoreDefaultArgs: [ '--hide-scrollbars' ] };

  try {
    var puppeteer = await new Promise((resolve,reject) => {
      report.getPuppeteer(async function(err, p){
        if(err) return reject(err);
        resolve(p);
      });
    });
    return await puppeteer.launch(browserParams);
  } catch (e) {
    console.error(e);
  }
}

function assertError(actual, expected, message) {
  if (!expected) return assert.equal(actual, expected, message);
  if (actual && expected) {
    assert.equal(actual.length, expected.length, message);
    actual = actual.map(function(e) {return e.message;});
    assert.deepEqual(actual, expected, message);
  }
}

describe('commands', function() {
  this.timeout(4000);
  var screenshotDir = __dirname+'/data';

  before(async function () {
    var jsh = this.jsh = new jsHarmonyTest.Application();
    jsh.Config.silentStart = true;
    jsh.Config.interactive = true;
    jsh.Config.system_settings.automatic_schema = false;
    jsh.Extensions.report = report;
    jsh.Extensions.image = image;
  
    this.browser = await getBrowser();
    this.page = await this.browser.newPage();
    this.page.on('console', function(msg) {console.log('browser: ', msg.text());});
    this.testRun = new jsHarmonyTestRun('file://'+__dirname+'/', jsh, {
      id: 'test',
      path: screenshotDir,
    });

    // navigate here, because everything else needs a page
    var result = await this.testRun.runCommand({exec: 'navigate', url: 'commands.html'}, this.page, {});
    assertError(result.errors, undefined);
  });
  after(async function() {
    if (this.page) await this.page.close();
    delete this.page;
    if (this.browser) this.browser.close();
    delete this.browser;
  });

  it('screenshot', async function() {
    var imagePath = screenshotDir+'/test_image_950_700.png';
    try {
      if (await fs.promises.access(imagePath)) await fs.promises.unlink(imagePath);
    } catch {};
    var result = await this.testRun.runCommand({exec: 'screenshot', id: 'image'}, this.page, {});
    assertError(result.errors, []);
    await fs.promises.access(imagePath); // throws on access failure
  });

  it('base screenshot', async function() {
    this.testRun.screenshotConfig.screenshot = {width: 360};
    var imagePath = screenshotDir+'/test_base_360_700.png';
    try {
      if (await fs.promises.access(imagePath)) await fs.promises.unlink(imagePath);
    } catch {};
    var result = await this.testRun.runCommand({exec: 'screenshot', id: 'base'}, this.page, {});
    assertError(result.errors, []);
    await fs.promises.access(imagePath); // throws on access failure
  });

  it('wait', async function() {
    var result = await this.testRun.runCommand({exec: 'wait', element: '#loaded'}, this.page, {});
    assertError(result.errors, []);
  });

  it('wait - while waiting', async function() {
    this.timeout(1000);
    var result = await this.testRun.runCommand({exec: 'wait', element: '#inserted', while_waiting: [{exec: 'js', js: 'return page.$eval("#container", function(el) {el.innerHTML = \'<div id="inserted"></div>\'});'}]}, this.page, {});
    assertError(result.errors, []);
  });

  it('input - text', async function() {
    var result = await this.testRun.runCommand({exec: 'input', element: '#text', value: 'text'}, this.page, {});
    assertError(result.errors, undefined);
  });

  it('input - checkbox', async function() {
    var result = await this.testRun.runCommand({exec: 'input', element: '#checkbox', value: true}, this.page, {});
    assertError(result.errors, undefined);
  });

  it('input - select', async function() {
    var result = await this.testRun.runCommand({exec: 'input', element: 'select', value: '1'}, this.page, {});
    assertError(result.errors, undefined);
  });

  it('click', async function() {
    var result = await this.testRun.runCommand({exec: 'click', element: '#checkbox'}, this.page, {});
    assertError(result.errors, undefined);
  });

  it('set', async function() {
    var variables = {};
    var result = await this.testRun.runCommand({exec: 'set', variable: 'var', value: {element: '#var', property: 'text'}}, this.page, variables);
    assertError(result.errors, undefined);
    assert.equal(variables.var, 'value');
  });

  it('js - callback success', async function() {
    var result = await this.testRun.runCommand({exec: 'js', js: 'cb()'}, this.page, {});
    assertError(result.errors, undefined);
  });

  it('js - callback failure', async function() {
    var result = await this.testRun.runCommand({exec: 'js', js: 'cb("error")'}, this.page, {});
    assert.equal(result.errors.length, 1);
    assert.equal(result.errors[0].message, 'error');
    assert(result.errors[0].command, 'command not assigned');
    assert.equal(result.errors[0].command.exec, 'js');
  });

  it('js - promise success', async function() {
    var result = await this.testRun.runCommand({exec: 'js', js: 'return new Promise(function(resolve,reject){ resolve(); });'}, this.page, {});
    assertError(result.errors, undefined);
  });

  it('js - promise failure', async function() {
    var result = await this.testRun.runCommand({exec: 'js', js: 'return new Promise(function(resolve,reject){ reject("error"); });'}, this.page, {});
    assert.equal(result.errors.length, 1);
    assert.equal(result.errors[0].message, 'error');
    assert(result.errors[0].command, 'command not assigned');
    assert.equal(result.errors[0].command.exec, 'js');
  });

  it('assert', async function() {
    var result = await this.testRun.runCommand({exec: 'assert', element: '#loaded', text: 'Loaded'}, this.page, {});
    assertError(result.errors, undefined);
  });

});