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

var jsHarmonyTestScreenshot = require('../jsHarmonyTestScreenshot');
var jsHarmonyTest = require('../jsHarmonyTest.js');

var assert = require('assert');
var path = require('path');

describe('test loading', function() {
  function testApp() {
    var jsh = new jsHarmonyTest.Application();
    jsh.Config.silentStart = true;
    jsh.Config.interactive = true;
    jsh.Config.system_settings.automatic_schema = false;

    var appbasepath = 'test/app';
    var datadir = path.join(appbasepath, 'data');
  
    jsh.Config.appbasepath = appbasepath;
    jsh.Config.datadir = datadir;
    return jsh;
  }

  var app;

  before(function() {
    app = testApp();
  });
  after(function() {
    app = null;
    process.removeAllListeners('uncaughtException');
  });

  it('empty test, no config', async function() {
    var test = new jsHarmonyTestScreenshot(app, {}, 'test/loading/empty', 'test/app/data');
    var tests = await test.loadTests();
    assert.equal(tests.length, 1);
    assert.equal(tests[0].base_url, 'http://localhost:0');
  });
  it('empty test, argument config', async function() {
    var test = new jsHarmonyTestScreenshot(app, {server: "arg"}, 'test/loading/empty', 'test/app/data');
    var tests = await test.loadTests();
    assert.equal(tests.length, 1);
    assert.equal(tests[0].base_url, 'arg');
  });
  it('empty test, peer config', async function() {
    var test = new jsHarmonyTestScreenshot(app, {server: "arg"}, 'test/loading/peer', 'test/app/data');
    var tests = await test.loadTests();
    assert.equal(tests.length, 1);
    assert.equal(tests[0].base_url, 'peer');
  });
  it('load test in subfolder', async function() {
    var test = new jsHarmonyTestScreenshot(app, {server: "arg"}, 'test/loading/emptyparent', 'test/app/data');
    var tests = await test.loadTests();
    assert.equal(tests.length, 1);
    assert.equal(tests[0].base_url, 'sub');
  });
  it('parent config', async function() {
    var test = new jsHarmonyTestScreenshot(app, {server: "arg"}, 'test/loading/parentconfig', 'test/app/data');
    var tests = await test.loadTests();
    assert.equal(tests.length, 1);
    assert.equal(tests[0].base_url, 'parent');
  });
});
