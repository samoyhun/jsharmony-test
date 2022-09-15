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

var async = require('async');
var _ = require('lodash');

function jsHarmonyTestRecorder(api, options){
  this.options = _.extend({
    fullElementPath: false,
  }, options);

  this.jsh = api.jsh;
  this.browser = null;
  this.browserreqcount = 0;
}


jsHarmonyTestRecorder.prototype.LaunchPuppeteer = function(options, callback){
  var _this = this;
  _this.jsh.Extensions.report.getPuppeteer(function(err, puppeteer){
    if(err){ _this.jsh.Log.error(err.toString(), {ext: 'test'}); return callback(new Error(err.toString())); }
    var launchParams = _.extend({ ignoreHTTPSErrors: true, headless: false }, options);
    puppeteer.launch(launchParams)
      .then(function(rslt){
        _this.browser = rslt;
        _this.browser.on('disconnected', function(){
          _this.browser = null;
        });
        _this.browserreqcount = 0;
        return callback(null, _this.browser);
      })
      .catch(function(err){ _this.jsh.Log.error(err, {ext: 'test'}); return callback(err); });
  });
};

jsHarmonyTestRecorder.prototype.Run = function(callback){
  var _this = this;

  function logAction(txt){
    console.log(txt); //eslint-disable-line no-console
  }

  async.waterfall([
    function(cb){
      _this.LaunchPuppeteer({  }, function(err){ return cb(err); });
    },
    function(cb){
      (async function(){
        _this.browser.on('disconnected', function(){
          flushQueue();
          logAction('Browser Closed');
          return cb();
        });
        var pages = await _this.browser.pages();
        var page = pages[0];
        page.on('framenavigated', function(frame){
          if(frame._parentFrame) return;
          logAction('{ "exec": "navigate", "url": '+JSON.stringify(frame.url()) + ' }');
        });
        var lastEvent = null;
        function flushQueue(){
          if(lastEvent) logEvent(lastEvent.action, lastEvent.element, lastEvent.props, true);
        }
        function logEvent(action, element, props, force){
          props = props || {};
          var eventData = {
            action: action,
            element: element,
            props: props,
          };
          if(!force){
            var sameEvent = (lastEvent && (lastEvent.action == action) && (lastEvent.element == element));
            if(lastEvent && !sameEvent && (action=='input')){
              logEvent(lastEvent.action, lastEvent.element, lastEvent.props, true);
              return logEvent(action, element, props, force);
            }
            if(sameEvent || (!lastEvent && (action=='input'))){
              if(lastEvent){
                lastEvent.props.value = (lastEvent.props.value||'') + (props.value||'');
              }
              else lastEvent = eventData;
              return;
            }
            if(lastEvent){
              logEvent(lastEvent.action, lastEvent.element, lastEvent.props, true);
            }
          }
          var rslt = '{';
          rslt += ' "exec": '+JSON.stringify(action);
          rslt += ', "element": '+JSON.stringify(element);
          for(var key in props){
            rslt += ', ' + key + ': ' + JSON.stringify(props[key]);
          }
          rslt += ' }';
          logAction(rslt);
          lastEvent = null;
        }
        function logInfo(info){
          logAction(info);
        }
        async function getConfig(){
          return _this.options;
        }
        await page.exposeFunction('logInfo', logInfo);
        await page.exposeFunction('logEvent', logEvent);
        await page.exposeFunction('getConfig', getConfig);
        await page.evaluateOnNewDocument(async function(){
          var curConfig = await getConfig();
          function getDescriptor(obj){
            var rslt = '';
            if(curConfig.fullElementPath){
              var nodeName = (obj.nodeName||'').toLowerCase();
              if(nodeName=='#document') return '';
              if(nodeName=='html') return '';
              if(nodeName=='body') return '';
              if(nodeName) rslt += nodeName;
              if(obj.id) rslt += '#'+obj.id;
              if(obj.classList){
                for(let i=0;i<obj.classList.length;i++){
                  rslt += '.' + obj.classList[i];
                }
              }
              if(obj.getAttribute('name')){
                rslt += '[name=' + obj.getAttribute('name')+']';
                if(document.querySelectorAll(rslt).length == 1) return rslt;
              }
              if(obj.parentNode){
                let parentMatches = obj.parentNode.querySelectorAll(rslt);
                if(parentMatches.length > 1){
                  for(let i=0;i<parentMatches.length;i++){
                    if(parentMatches[i]==obj){
                      rslt += ':nth-child('+(i+1).toString()+')';
                      break;
                    }
                  }
                }

                let parentDescriptor = getDescriptor(obj.parentNode);
                return (parentDescriptor + ' ' + rslt).trim();
              }
            }
            else {
              if(obj.id){
                rslt += '#'+obj.id;
                if(document.querySelectorAll(rslt).length == 1) return rslt;
              }
              if(obj.classList){
                for(let i=0;i<obj.classList.length;i++){
                  rslt += '.' + obj.classList[i];
                  if(document.querySelectorAll(rslt).length == 1) return rslt;
                }
              }
              if(obj.getAttribute('name')){
                rslt += '[name=' + obj.getAttribute('name')+']';
                if(document.querySelectorAll(rslt).length == 1) return rslt;
              }
              if(obj.nodeName) rslt = obj.nodeName.toLowerCase() + rslt;
              if(document.querySelectorAll(rslt).length == 1) return rslt;

              if(obj.parentNode){
                rslt = '';

                var narrowedChild = false;
                if(obj.id){
                  rslt += '#'+obj.id;
                  if(obj.parentNode.querySelectorAll(rslt).length == 1) narrowedChild = true;
                }
                if(!narrowedChild && obj.classList){
                  for(let i=0;i<obj.classList.length;i++){
                    rslt += '.' + obj.classList[i];
                    if(obj.parentNode.querySelectorAll(rslt).length == 1){ narrowedChild = true; break; }
                  }
                }
                if(!narrowedChild && obj.getAttribute('name')){
                  rslt += '[name=' + obj.getAttribute('name')+']';
                  if(obj.parentNode.querySelectorAll(rslt).length == 1) narrowedChild = true;
                }
                if(!narrowedChild && obj.nodeName) rslt = obj.nodeName.toLowerCase() + rslt;
                if(!narrowedChild && obj.parentNode.querySelectorAll(rslt).length == 1) narrowedChild = true;

                let parentMatches = obj.parentNode.querySelectorAll(rslt);
                var foundMatch = false;
                if(parentMatches.length == 1){ foundMatch = true; }
                else if(parentMatches.length > 1){
                  for(let i=0;i<parentMatches.length;i++){
                    if(parentMatches[i]==obj){
                      rslt += ':nth-child('+(i+1).toString()+')';
                      foundMatch = true;
                      break;
                    }
                  }
                }
                if(!foundMatch) rslt += '!!!!NOMATCH!!!!';
                if(document.querySelectorAll(rslt).length == 1) return rslt;
                let parentDescriptor = getDescriptor(obj.parentNode);
                return (parentDescriptor + ' ' + rslt).trim();
              }
              return rslt += '!!!NOTUNIQUE!!!';
            }

            if(obj.parentNode) (getDescriptor(obj.parentNode) + ' ' + rslt).trim();
            return rslt.trim();
          }
          document.addEventListener('click', function(e){ logEvent('click', getDescriptor(e.target)); }, true);
          document.addEventListener('keypress', function(e){ logEvent('input', getDescriptor(e.target), { value: String.fromCharCode(e.keyCode) }); }, true);
        });
      })();
    },
  ], function(err){
    if(err) _this.jsh.Log.error(err, {ext: 'test'});
    logAction('Done');
    process.exit(0);
  });
};

module.exports = exports = jsHarmonyTestRecorder;