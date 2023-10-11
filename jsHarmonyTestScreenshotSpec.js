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
var async = require('async');

function jsHarmonyTestScreenshotSpec(){
  this.sourcePath; // path to the file that defined the test
  this.url = ''; //Relative or absolute URL, including querystring
  this.batch = null;
  this.x = 0;
  this.y = 0;
  this.width = 950;
  this.height = 700;
  this.browserWidth = null;
  this.browserHeight = null;
  this.trim = true;
  this.resize = null; //{ width: xxx, height: yyy }
  this.postClip = null; //{ x: 0, y: 0, width: xxx, height: yyy }
  this.cropToSelector = null; //".selector"
  this.onload = function(){}; //function(){ return new Promise(function(resolve){ /* FUNCTION_STRING */ }); }
  this.beforeScreenshot = null; //function(jsh, page, cb){ /* FUNCTION_STRING */ }
  this.waitBeforeScreenshot = 0;
  this.exclude = [
    //Rectangle: { x: ###, y: ###, width: ###, height: ### },
    //Selector: { selector: ".C_ID" }
  ];
  this.importWarnings = [];
  this.testWarnings = [];
  this.testErrors = [];
}

const allowedProperties = {
  'exec': '',
  'id': '',
  'batch': 0,
  'x': 0,
  'y': 0,
  'width': 950,
  'height': 700,
  'beforeScreenshot': '',  // Server-side JS code
  'onload': '', // In-browser JS code
  'waitBeforeScreenshot': 0,
  'cropToSelector': '', // .C_ID
  'postClip': {},
  'trim': true, // true | false
  'exclude': []
};

const getSelectorRectangle = function (selector) {
  document.querySelector('html').style.overflow = 'hidden';
  if (!selector) return null;
  return new Promise(function (resolve) {
    /* globals jshInstance */
    if (!jshInstance) return resolve();
    var $ = jshInstance.$;
    var jobjs = $(selector);
    if (!jobjs.length) return resolve();
    var startpos = null;
    var endpos = null;
    for (var i = 0; i < jobjs.length; i++) {
      var jobj = $(jobjs[i]);
      var offset = jobj.offset();
      
      var offStart = {left: offset.left - 1, top: offset.top - 1};
      var offEnd = {left: offset.left + 1 + jobj.outerWidth(), top: offset.top + 1 + jobj.outerHeight()};
      
      if (!startpos) startpos = offStart;
      if (offStart.left < startpos.left) startpos.left = offStart.left;
      if (offStart.top < startpos.top) startpos.top = offStart.top;
      
      if (!endpos) endpos = offEnd;
      if (offEnd.left > endpos.left) endpos.left = offEnd.left;
      if (offEnd.top > endpos.top) endpos.top = offEnd.top;
    }
    return resolve({
      x: startpos.left,
      y: startpos.top,
      width: endpos.left - startpos.left,
      height: endpos.top - startpos.top
    });
  });
};

const addElement = function (elem) {
  document.querySelector('html').style.overflow = 'hidden';
  if (!elem) return null;
  if (!jshInstance) return null;
  var $ = jshInstance.$;
  var _elem = $(elem);
  $('html').append(_elem);
};



const excludeElem = async function(exl,page){
  var excludeRectangle = (exl['selector']) ? await page.evaluate(getSelectorRectangle, exl['selector']): exl;
  if(!excludeRectangle) {
    return ['Selector "'+exl['selector']+'" does not exist on the page'];
  }
  await page.evaluate(addElement, generateHoverDiv(excludeRectangle));
  return [];
};

const clearExcludes = async function(page){
  await page.evaluate(function(){
    var nextElem;
    while(nextElem = document.querySelector('.jsHarmonyTestHoverDiv')){ //eslint-disable-line no-cond-assign
      nextElem.parentNode.removeChild(nextElem);
    }
  });
  return [];
};

const sleep = function(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
};

const generateHoverDiv = function(dimensions){
  let d = "<div class='jsHarmonyTestHoverDiv' style='background-color: black; position: absolute; width: {{width}}px; height: {{height}}px; top:{{top}}px; left: {{left}}px;'></div>";
  return d.replace('{{width}}',dimensions.width)
    .replace('{{height}}',dimensions.height)
    .replace('{{top}}',dimensions.y)
    .replace('{{left}}',dimensions.x);
};

//Parse a JSON object and return a jsHarmonyTestScreenshotSpec object
//  Ensure the spec is correct and has no extra fields
//  Parameters:
//    obj: The JSON object
//Returns a jsHarmonyTestScreenshotSpec object
jsHarmonyTestScreenshotSpec.fromJSON = function(obj){
  let jsTS = new jsHarmonyTestScreenshotSpec();
  let warnings = [];
  _.forEach(_.keys(obj), function(key) {
    if (!(key in allowedProperties)) {
      warnings.push('Unknown property [' + key + '] in screenshot');
    }
  });
  const conf = _.extend({importWarnings: warnings},_.omit(obj,['id']));
  _.assign(jsTS,conf);
  return jsTS;
};

function sanitizePath(string) {
  return string.replace(/[^0-9A-Za-z]/g, '_');
}

jsHarmonyTestScreenshotSpec.prototype.generateFilename = function(id){
  //Generate file name
  var fname = sanitizePath(id);
  if(this.width) fname += '_' + this.width;
  if(this.height) fname += '_' + this.height;
  fname += '.png';
  return fname;
};

//Generate a screenshot and save to the target file
//  Parameters:
//    browser: A puppeteer Browser object
//    jsh: jsharmony, used for image processing, and beforeScreenshot, which can do... anything
//    fpath: The full path to the destination file
//    cb: The callback function to be called on completion
jsHarmonyTestScreenshotSpec.prototype.generateScreenshot = async function (page, jsh, fpath, cb) {
  if (!page) {
    if (cb) return cb(new Error('no browser available, Please configure jsh.Extensions.report'));
    else return;
  }
  let _this = this;
  if (!this.browserWidth) this.browserWidth = this.x + this.width;
  if (!this.browserHeight) this.browserHeight = this.height;

  let testWarnings = [];
  let testErrors = [];
  let cropRectangle = null;
  try {
    await page.setViewport({
      width: parseInt(this.browserWidth),
      height: parseInt(this.browserHeight)
    });
    var screenshotParams = {path: fpath, type: 'png'};

    if (!_.isEmpty(this.onload)){
      var func_onload = parseHandler(jsh, this.onload, [], 'onload', this.sourcePath);
      await page.evaluate(func_onload);
    }
    if (this.cropToSelector){
      cropRectangle = await page.evaluate(getSelectorRectangle, this.cropToSelector);
    }
    if (this.exclude.length){
      let warnings = [];
      for(var i=0; i<this.exclude.length;i++){
        warnings.concat(await excludeElem(this.exclude[i],page) || []);
      }
      testWarnings = testWarnings.concat(warnings);
    }
    if (cropRectangle) this.postClip = cropRectangle;
    if (this.height) {
      screenshotParams.clip = {
        x: this.x,
        y: this.y,
        width: this.width,
        height: this.height
      };
    } else screenshotParams.fullPage = true;
    if(this.waitBeforeScreenshot){
      await sleep(this.waitBeforeScreenshot);
    }
    if (!_.isEmpty(this.beforeScreenshot)){
      // beforeScreenshot:function(jsh, page, cb, cropRectangle){
      //     page.click('.xsearch_column').then(cb).catch(function (err) { jsh.Log.error(err, {ext: 'test'}); return cb() });
      // }
      // "beforeScreenshot": "function(jsh, page, cb, cropRectangle){return page.click('.xsearchbutton.xsearchbuttonjsHarmonyFactory_QNSSL1');}"
      var func_beforeScreenshot = parseHandler(jsh, this.beforeScreenshot, ['jsh', 'page', 'cb', 'cropRectangle'], 'beforeScreenshot', this.sourcePath);
      await new Promise((resolve) => {
        try{
          func_beforeScreenshot(jsh,page,function(ret) {if (_.isError(ret)) testErrors.push(ret); resolve();}, cropRectangle);
        }catch (e) {
          testErrors.push(e);
          resolve();
        }
      });
    }
    await page.screenshot(screenshotParams);
    await this.processScreenshot(fpath, _this, jsh);
    if (this.exclude.length){
      await clearExcludes(page);
    }
    this.testWarnings = testWarnings;
    this.testErrors = testErrors;
    if(cb) return cb();
  }catch (e) {
    testErrors.push(e);
    this.testWarnings = testWarnings;
    this.testErrors = testErrors;
    if(cb) return cb(e);
  }
};

function parseHandler(jsh, handler, args, desc, scriptPath) {
  if (_.isArray(handler)) handler = handler.join('');
  return jsh.createFunction(handler, args, desc, scriptPath);
}

jsHarmonyTestScreenshotSpec.prototype.processScreenshot = function (fpath, params, jsh) {
  return new Promise((resolve, reject) => {
    async.waterfall([
      function(img_cb){
        if(!params.postClip && !params.trim) return img_cb();
        var cropParams = [null, null, { resize: false }];
        if(params.postClip){
          cropParams[0] = params.postClip.width;
          cropParams[1] = params.postClip.height;
          cropParams[2].x = params.postClip.x;
          cropParams[2].y = params.postClip.y;
        }
        if(params.trim) cropParams[2].trim = true;
        jsh.Extensions.image.crop(fpath, fpath, cropParams, 'png', img_cb);
      },
      function(img_cb){
        if(!params.resize) return img_cb();
        var resizeParams = [params.resize.width||null, params.resize.height||null];
        jsh.Extensions.image.resize(fpath, fpath, resizeParams, 'png', img_cb);
      },
    ], function(err){
      if (err) reject(err);
      else resolve();
    });
  });
};

module.exports = exports = jsHarmonyTestScreenshotSpec;