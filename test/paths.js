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
var jsHarmonyTestAPI = require('../api');

var assert = require('assert');
var path = require('path');

describe('path configuration', function() {
  describe('api', function() {
    afterEach(function() {
      process.removeAllListeners('uncaughtException');
    });

    it('default values', function() {
      var api = new jsHarmonyTestAPI({});
      assert.equal(api.jsh.Config.appbasepath, path.resolve(''));
      assert.equal(api.jsh.Config.datadir, path.resolve('data'));
    });
    it('test folder', function() {
      var api = new jsHarmonyTestAPI({testFolderPath: 'test/path'});
      assert.equal(api.jsh.Config.appbasepath, path.resolve('test/path'));
      assert.equal(api.jsh.Config.datadir, path.resolve('test/path/data'));
    });
    it('loaded an explicit config file', function() {
      var api = new jsHarmonyTestAPI({configPath: 'test/config/_exists.json'});
      assert.equal(api.jsh.Config.appbasepath, path.resolve(''));
      assert.equal(api.jsh.Config.datadir, path.resolve('data'));
      assert(api.jsh.Modules['jsHarmonyTest'].Config.exists, 'value from config file set');
    });
    it('loaded an implicit config file', function() {
      var api = new jsHarmonyTestAPI({testFolderPath: 'test/config/exists'});
      assert.equal(api.jsh.Config.appbasepath, path.resolve('test/config/exists'));
      assert.equal(api.jsh.Config.datadir, path.resolve('test/config/exists/data'));
      assert(api.jsh.Modules['jsHarmonyTest'].Config.exists, 'value from config file set');
    });
    it('config with appbasepath', function() {
      var api = new jsHarmonyTestAPI({configPath: 'test/config/_appbasepath.json'});
      assert.equal(api.jsh.Config.appbasepath, path.resolve('test/config/base'));
      assert.equal(api.jsh.Config.datadir, path.resolve('test/config/base/data'));
    });
    it('config with datadir', function() {
      var api = new jsHarmonyTestAPI({configPath: 'test/config/_datadir.json'});
      assert.equal(api.jsh.Config.appbasepath, path.resolve(''));
      assert.equal(api.jsh.Config.datadir, path.resolve('test/config/datadir'));
    });
    it('config with both', function() {
      var api = new jsHarmonyTestAPI({configPath: 'test/config/_paths.json'});
      assert.equal(api.jsh.Config.appbasepath, path.resolve('test/config/base'));
      assert.equal(api.jsh.Config.datadir, path.resolve('test/config/datadir'));
    });
    it('parent dir', function() {
      var api = new jsHarmonyTestAPI({configPath: 'test/config/_parent.json'});
      assert.equal(api.jsh.Config.appbasepath, path.resolve('.'));
      assert.equal(api.jsh.Config.datadir, path.resolve('test/datadir'));
    });

    describe('internal screenshots object paths', function() {
      it('default values', function() {
        var api = new jsHarmonyTestAPI({});
        var test = api.jsHarmonyTestScreenshot({});
        assert.equal(test.test_spec_path, path.resolve('.'));
        assert.equal(test.test_data_path, path.resolve('data\\jsharmony-test\\screenshots'));
      });
      it('test folder path', function() {
        var api = new jsHarmonyTestAPI({testFolderPath: 'test/path'});
        var test = api.jsHarmonyTestScreenshot({});
        assert.equal(test.test_spec_path, path.resolve('test\\path'));
        assert.equal(test.test_data_path, path.resolve('test\\path\\data\\jsharmony-test\\screenshots'));
      });
      it('config with both', function() {
        var api = new jsHarmonyTestAPI({configPath: 'test/config/_paths.json'});
        var test = api.jsHarmonyTestScreenshot({});
        assert.equal(test.test_spec_path, path.resolve('.'));
        assert.equal(test.test_data_path, path.resolve('test\\config\\datadir\\jsharmony-test\\screenshots'));
      });
    });
  });

  describe('test config', function() {
    function testApp() {
      var jsh = new jsHarmonyTest.Application();
      jsh.Config.silentStart = true;
      jsh.Config.interactive = true;
      jsh.Config.onConfigLoaded.push(function(cb){
        jsh.Config.system_settings.automatic_schema = false;
        //jsh.Extensions.report = require('jsharmony-report');
        //jsh.Extensions.image = require('jsharmony-image-magick');
        return cb();
      });
    
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

    it('minimal arguments', function() {
      var test = new jsHarmonyTestScreenshot(app, {});
      assert.equal(test.test_spec_path, path.resolve('.'));
      assert.equal(test.test_data_path, path.resolve('data\\jsharmony-test\\screenshots'));
      assert.equal(test.screenshotsMasterDir(), path.resolve('data\\jsharmony-test\\screenshots\\master'));
      assert.equal(test.screenshotsComparisonDir(), path.resolve('data\\jsharmony-test\\screenshots\\comparison'));
      assert.equal(test.resultFilePath(), path.resolve('data\\jsharmony-test\\screenshots\\screenshots.result.html'));
      assert.equal(test.reviewFilePath(), path.resolve('data\\jsharmony-test\\screenshots\\screenshots.review.html'));
    });
    it('specific folders', function() {
      var test = new jsHarmonyTestScreenshot(app, {}, 'test/config', 'test/app/data/tests');
      assert.equal(test.test_spec_path, path.resolve('test\\config'));
      assert.equal(test.test_data_path, path.resolve('test\\app\\data\\tests'));
      assert.equal(test.screenshotsMasterDir(), path.resolve('test\\app\\data\\tests\\master'));
      assert.equal(test.screenshotsComparisonDir(), path.resolve('test\\app\\data\\tests\\comparison'));
      assert.equal(test.resultFilePath(), path.resolve('test\\app\\data\\tests\\screenshots.result.html'));
      assert.equal(test.reviewFilePath(), path.resolve('test\\app\\data\\tests\\screenshots.review.html'));
    });
  });
});
