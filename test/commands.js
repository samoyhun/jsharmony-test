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
var jsHarmonyTestSpec = require('../jsHarmonyTestSpec');
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

describe('commands', function() {
  this.timeout(4000);
  var jsh;

  before(async function () {
    jsh = this.jsh = new jsHarmonyTest.Application();
    jsh.Config.silentStart = true;
    jsh.Config.interactive = true;
    jsh.Config.system_settings.automatic_schema = false;
    jsh.Extensions.report = report;
    jsh.Extensions.image = image;
  
    this.browser = await getBrowser();
    this.page = await this.browser.newPage();
    this.page.on('console', function(msg) {console.log(msg.text());});
    this.testSpec = jsHarmonyTestSpec.fromJSON('file://'+__dirname+'/', 'test', {});

    // navigate here, because everything else needs a page
    var result = await this.testSpec.runCommand({exec: 'navigate', url: 'commands.html'}, this.page, {}, jsh, '');
    assert.deepEqual(result.errors, undefined);
  });
  after(async function() {
    delete this.page;
    if (this.browser) this.browser.close();
    delete this.browser;
  });

  it('screenshot', async function() {
    var imagePath = __dirname+'/data/test_950_700.png';
    await fs.promises.unlink(imagePath);
    var result = await this.testSpec.runCommand({exec: 'screenshot', id: 'test'}, this.page, {}, jsh, __dirname+'/data');
    assert.deepEqual(result.errors, []);
    await fs.promises.access(imagePath); // throws on access failure
  });

  it('wait', async function() {
    var result = await this.testSpec.runCommand({exec: 'wait', element: '#loaded'}, this.page, {}, jsh, '');
    assert.deepEqual(result.errors, undefined);
  });

  it('input - text', async function() {
    var result = await this.testSpec.runCommand({exec: 'input', element: '#text', value: 'text'}, this.page, {}, jsh, '');
    assert.deepEqual(result.errors, undefined);
  });

  it('input - checkbox', async function() {
    var result = await this.testSpec.runCommand({exec: 'input', element: '#checkbox', value: true}, this.page, {}, jsh, '');
    assert.deepEqual(result.errors, undefined);
  });

  it('input - select', async function() {
    var result = await this.testSpec.runCommand({exec: 'input', element: 'select', value: '1'}, this.page, {}, jsh, '');
    assert.deepEqual(result.errors, undefined);
  });

  it('click', async function() {
    var result = await this.testSpec.runCommand({exec: 'click', element: '#checkbox'}, this.page, {}, jsh, '');
    assert.deepEqual(result.errors, undefined);
  });

  it('set', async function() {
    var variables = {};
    var result = await this.testSpec.runCommand({exec: 'set', variable: 'var', value: {element: '#var', property: 'text'}}, this.page, variables, jsh, '');
    assert.deepEqual(result.errors, undefined);
    assert.equal(variables.var, 'value');
  });

  it('js - callback success', async function() {
    var result = await this.testSpec.runCommand({exec: 'js', js: 'cb()'}, this.page, {}, jsh, '');
    assert.deepEqual(result.errors, undefined);
  });

  it('js - callback failure', async function() {
    var result = await this.testSpec.runCommand({exec: 'js', js: 'cb("error")'}, this.page, {}, jsh, '');
    assert.deepEqual(result.errors, ['error']);
  });

  it('js - promise success', async function() {
    var result = await this.testSpec.runCommand({exec: 'js', js: 'return new Promise(function(resolve,reject){ resolve(); });'}, this.page, {}, jsh, '');
    assert.deepEqual(result.errors, undefined);
  });

  it('js - promise failure', async function() {
    var result = await this.testSpec.runCommand({exec: 'js', js: 'return new Promise(function(resolve,reject){ reject("error"); });'}, this.page, {}, jsh, '');
    assert.deepEqual(result.errors, ['error']);
  });

  it('assert', async function() {
    var result = await this.testSpec.runCommand({exec: 'assert', element: '#loaded', text: 'Loaded'}, this.page, {}, jsh, '');
    assert.deepEqual(result.errors, undefined);
  });

});