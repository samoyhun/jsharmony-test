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

var jsHarmonyTestSpec = require('../jsHarmonyTestSpec');
var report = require('jsharmony-report');

var assert = require('assert');
var path = require('path');

async function getBrowser() {
  var browserParams = { ignoreHTTPSErrors: true, headless: true, ignoreDefaultArgs: [ '--hide-scrollbars' ] };

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

describe('text selectors', function() {
  before(async function () {
    this.browser = await getBrowser();
    this.page = await this.browser.newPage();
    this.page.on('console', function(msg) {console.log(msg.text());});
    var resp = await this.page.goto('file://'+__dirname+'/text_selectors.html');
    this.testSpec = jsHarmonyTestSpec.fromJSON('server', 'id', {});
  });
  after(async function() {
    delete this.page;
    if (this.browser) this.browser.close();
    delete this.browser;
  });
  it('string', async function() {
    var result = await this.testSpec.command_assert({element: '#contains', text: 'string'}, this.page, {}, {}, '');
    assert.deepEqual(result.errors, undefined);
  });

  it('equals', async function() {
    var result = await this.testSpec.command_assert({element: '#equals', text: {equals: 'exactly'}}, this.page, {}, {}, '');
    assert.deepEqual(result.errors, undefined);
  });
  it('equals and no more', async function() {
    var result = await this.testSpec.command_assert({element: '#equalsplus', text: {equals: 'exactly'}}, this.page, {}, {}, '');
    assert.deepEqual(result.errors, ['assert: #equalsplus did not match the text selector']);
  });
  it('equals case sensitive', async function() {
    var result = await this.testSpec.command_assert({element: '#equals', text: {equals: 'Exactly'}}, this.page, {}, {}, '');
    assert.deepEqual(result.errors, ['assert: #equals did not match the text selector']);
  });
  it('equals case insensitive', async function() {
    var result = await this.testSpec.command_assert({element: '#equals', text: {equals: 'Exactly', case: 'insensitive'}}, this.page, {}, {}, '');
    assert.deepEqual(result.errors, undefined);
  });

  it('not_equals', async function() {
    var result = await this.testSpec.command_assert({element: '#equals', text: {not_equals: 'exactly'}}, this.page, {}, {}, '');
    assert.deepEqual(result.errors, ['assert: #equals did not match the text selector']);
  });
  it('not_equals with some more', async function() {
    var result = await this.testSpec.command_assert({element: '#equalsplus', text: {not_equals: 'exactly'}}, this.page, {}, {}, '');
    assert.deepEqual(result.errors, undefined);
  });
  it('not_equals case sensitive', async function() {
    var result = await this.testSpec.command_assert({element: '#equals', text: {not_equals: 'Exactly'}}, this.page, {}, {}, '');
    assert.deepEqual(result.errors, undefined);
  });
  it('not_equals case insensitive', async function() {
    var result = await this.testSpec.command_assert({element: '#equals', text: {not_equals: 'Exactly', case: 'insensitive'}}, this.page, {}, {}, '');
    assert.deepEqual(result.errors, ['assert: #equals did not match the text selector']);
  });

  it('contains', async function() {
    var result = await this.testSpec.command_assert({element: '#contains', text: {contains: 'string'}}, this.page, {}, {}, '');
    assert.deepEqual(result.errors, undefined);
  });
  it('does not contains', async function() {
    var result = await this.testSpec.command_assert({element: '#something', text: {contains: 'string'}}, this.page, {}, {}, '');
    assert.deepEqual(result.errors, ['assert: #something did not match the text selector']);
  });
  it('contains case sensitive', async function() {
    var result = await this.testSpec.command_assert({element: '#contains', text: {contains: 'String'}}, this.page, {}, {}, '');
    assert.deepEqual(result.errors, ['assert: #contains did not match the text selector']);
  });
  it('contains case insensitive', async function() {
    var result = await this.testSpec.command_assert({element: '#contains', text: {contains: 'String', case: 'insensitive'}}, this.page, {}, {}, '');
    assert.deepEqual(result.errors, undefined);
  });

  it('not_contains', async function() {
    var result = await this.testSpec.command_assert({element: '#something', text: {not_contains: 'string'}}, this.page, {}, {}, '');
    assert.deepEqual(result.errors, undefined);
  });
  it('not_contains, does', async function() {
    var result = await this.testSpec.command_assert({element: '#contains', text: {not_contains: 'string'}}, this.page, {}, {}, '');
    assert.deepEqual(result.errors, ['assert: #contains did not match the text selector']);
  });
  it('not_contains, case sensitive', async function() {
    var result = await this.testSpec.command_assert({element: '#contains', text: {not_contains: 'String'}}, this.page, {}, {}, '');
    assert.deepEqual(result.errors, undefined);
  });
  it('not_contains, case sensitive', async function() {
    var result = await this.testSpec.command_assert({element: '#contains', text: {not_contains: 'String', case: 'insensitive'}}, this.page, {}, {}, '');
    assert.deepEqual(result.errors, ['assert: #contains did not match the text selector']);
  });

  it('begins_with', async function() {
    var result = await this.testSpec.command_assert({element: '#beginend', text: {begins_with: 'begin'}}, this.page, {}, {}, '');
    assert.deepEqual(result.errors, undefined);
  });
  it('does not begins_with', async function() {
    var result = await this.testSpec.command_assert({element: '#something', text: {begins_with: 'begin'}}, this.page, {}, {}, '');
    assert.deepEqual(result.errors, ['assert: #something did not match the text selector']);
  });
  it('begins_with, case sensitive', async function() {
    var result = await this.testSpec.command_assert({element: '#beginend', text: {begins_with: 'Begin'}}, this.page, {}, {}, '');
    assert.deepEqual(result.errors, ['assert: #beginend did not match the text selector']);
  });
  it('begins_with, case insensitive', async function() {
    var result = await this.testSpec.command_assert({element: '#beginend', text: {begins_with: 'Begin', case: 'insensitive'}}, this.page, {}, {}, '');
    assert.deepEqual(result.errors, undefined);
  });

  it('ends_with', async function() {
    var result = await this.testSpec.command_assert({element: '#beginend', text: {ends_with: 'end'}}, this.page, {}, {}, '');
    assert.deepEqual(result.errors, undefined);
  });
  it('does not ends_with', async function() {
    var result = await this.testSpec.command_assert({element: '#something', text: {ends_with: 'end'}}, this.page, {}, {}, '');
    assert.deepEqual(result.errors, ['assert: #something did not match the text selector']);
  });
  it('ends_with, case sensitive', async function() {
    var result = await this.testSpec.command_assert({element: '#beginend', text: {ends_with: 'End'}}, this.page, {}, {}, '');
    assert.deepEqual(result.errors, ['assert: #beginend did not match the text selector']);
  });
  it('ends_with, case insensitive', async function() {
    var result = await this.testSpec.command_assert({element: '#beginend', text: {ends_with: 'End', case: 'insensitive'}}, this.page, {}, {}, '');
    assert.deepEqual(result.errors, undefined);
  });

  it('regex', async function() {
    var result = await this.testSpec.command_assert({element: '#beginend', text: {regex: 'begin.*'}}, this.page, {}, {}, '');
    assert.deepEqual(result.errors, undefined);
  });
  it('does not match regex', async function() {
    var result = await this.testSpec.command_assert({element: '#something', text: {regex: 'begin'}}, this.page, {}, {}, '');
    assert.deepEqual(result.errors, ['assert: #something did not match the text selector']);
  });
  it('regex, case sensitive', async function() {
    var result = await this.testSpec.command_assert({element: '#beginend', text: {regex: 'Begin.*'}}, this.page, {}, {}, '');
    assert.deepEqual(result.errors, ['assert: #beginend did not match the text selector']);
  });
  it('regex, case insensitive', async function() {
    var result = await this.testSpec.command_assert({element: '#beginend', text: {regex: 'Begin.*', case: 'insensitive'}}, this.page, {}, {}, '');
    assert.deepEqual(result.errors, undefined);
  });
});