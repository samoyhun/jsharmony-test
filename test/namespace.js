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

describe('test namespaces and ids', function() {
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

  it('empty namespace at root', async function() {
    var test = new jsHarmonyTestScreenshot(app, {}, 'test/namespace/empty', 'test/app/data');
    var tests = await test.loadTests();
    assert.equal(tests.length, 1);
    assert.equal(tests[0].id, 'empty');
  });

  it('specified namespace', async function() {
    var test = new jsHarmonyTestScreenshot(app, {}, 'test/namespace/named', 'test/app/data');
    var tests = await test.loadTests();
    assert.equal(tests.length, 1);
    assert.equal(tests[0].id, 'config/empty');
  });

  it('empty namespace in subfolder', async function() {
    var test = new jsHarmonyTestScreenshot(app, {}, 'test/namespace/subdefault', 'test/app/data');
    var tests = await test.loadTests();
    assert.equal(tests.length, 1);
    assert.equal(tests[0].id, 'folder/empty');
  });

  it('specified namespace in subfolder', async function() {
    var test = new jsHarmonyTestScreenshot(app, {}, 'test/namespace/subnamed', 'test/app/data');
    var tests = await test.loadTests();
    assert.equal(tests.length, 1);
    assert.equal(tests[0].id, 'config/empty');
  });

  it('specified namespace in parent folder', async function() {
    var test = new jsHarmonyTestScreenshot(app, {}, 'test/namespace/parentnamed', 'test/app/data');
    var tests = await test.loadTests();
    assert.equal(tests.length, 1);
    assert.equal(tests[0].id, 'config/folder/empty');
  });

  it('specified file id', async function() {
    var test = new jsHarmonyTestScreenshot(app, {}, 'test/namespace/relative', 'test/app/data');
    var tests = await test.loadTests();
    assert.equal(tests.length, 1);
    assert.equal(tests[0].id, 'config/id');
  });

  it('absolute file id', async function() {
    var test = new jsHarmonyTestScreenshot(app, {}, 'test/namespace/absolute', 'test/app/data');
    var tests = await test.loadTests();
    assert.equal(tests.length, 1);
    assert.equal(tests[0].id, 'id');
  });

});
