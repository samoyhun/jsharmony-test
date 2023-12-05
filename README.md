# ==============
# jsharmony-test
# ==============

Testing tools for jsHarmony

## Installation

npm install jsharmony-test --save

## Setup
1. Create a folder in the project root named "test"
2. Create a _config.json file in the "test" folder with the following content
```javascript
{
  "server": "<your-server>",
  "appbasepath": "<path-to-test>", //Defaults to CWD
  //"datadir": "---", //Defaults to appbasepath/data
  "screenshot": {
    "width": <screenshot-width> 
  },
  // --"namespace": "", optional root namespace
  //--"require": [] //Requirements before any of the tests in this set are run
  //--"before": [COMMAND, COMMAND] //Run before each test is run
  //--"after": [COMMAND, COMMAND]  //Run after each test is run

  //change batch to text
  //apply / inherit config to all tests in this folder and all subfolders
  //  simple "override" in inheritance
}
```
3. Create a .json file for each test
```javascript
{
  "id": "TEST_ID",
  "title": "Test Name",
  "batch": "01_Test",  //Optional, used to sort tests. 
  "require": [ "TEST_ID1", "TEST_ID2" ],   //Array of tests that must be executed before this test. Primary method for sorting tests
  "commands": [ COMMAND, COMMAND ],  //Array of commands
}
```
4. The "test" folder should now appear as follows
```bash
└───test
        _config.json
        testName.json
```

## Running Tests

1. Create the test master screenshots
```
jsharmony test master screenshots test\handheld
```
* Optionally use the --show-browser argument to preview in the browser
2. Run tests
```
jsharmony test screenshots test\handheld
```
* Optionally use the --show-browser argument to preview in the browser

## Commands
#### Basic Command
```javascript
{ "exec": "...", "timeout": 10000 }
```
#### Navigate
```javascript
{ "exec": "navigate", "url": "https://localhost:3000" }
```
* The url property can use variables, e.g., "https://localhost:3000/App?token=@TOKEN"

#### Screenshot
```javascript
{ "exec": "screenshot", "id": "login_start" }
```
* Optional Parameters:
  * Any jsHarmony Test Screenshot parameters, e.g., "width": 1500

#### Wait
```javascript
{ "exec": "wait" }

//Example usage:
{ "exec": "wait", "element": ".homePage" }
{ "exec": "wait", "text": "Welcome!" }
```
* Optional Parameters:
  * "element": ELEMENT_SELECTOR   // Selector for the target element
  * "text": TEXT_SELECTOR         // The element or any child element containing the text
    * If no element is specified, wait for any child of the document containing the text
  * "while_waiting": [ COMMAND, COMMAND ]  // Execute commands after initiating wait

#### Input
```javascript
{ "exec": "input", "element": "selector", "value": "John Doe" }
```
* Value can also contain:
  * \r   (For "enter key")
  * {SPECIAL_KEY}  (For special keys as defined in the Puppeteer KeyInput object), e.g., {Backspace}
  * {SPECIAL_KEY1}{SPECIAL_KEY2}  (Multiple simultaneous special key presses)
* If the input is a checkbox, the value can be:
  * true :: checked
  * false :: unchecked
  * "true" :: checked
  * "false" :: unchecked
* When using variables, the value can be:
  * "@VARIABLE"
  * or contain additional characters, such as "M@VARIABLE\n"

#### Click
```javascript
{ "exec": "click", "element": "selector" }
```
* Optional Parameters:
  * "button": "left", "right", "middle"

#### Set
```javascript
{ "exec": "set", "variable": "VARIABLE", "value": "VALUE_GETTER" }
```
* Store variables in jsHarmonyTestConfig.variables

#### JS
```javascript
 { "exec": "js", "js": "return new Promise(function(resolve,reject){ resolve(); });" }
``` 
* Parameters passed to the JS function:
  * jsh - jsHarmony instance
  * page - Puppeteer Page
  * callback - Callback. If a Promise is returned by the JS, wait for the Promise to resolve

#### Assert
```javascript
{ "exec": "assert", "element": "selector", "value": "TEXT_SELECTOR" }
```
* Optional Parameters:
  * "error": "Container missing target text"  // Error description

## Selectors and Getters

#### TEXT_SELECTOR
* "text"  // Same as { "contains": "text" }
```javascript
  { "equals": "text" }       //Text string must be exact match
  { "not_equals": "text" }   //Text string must not match
  { "contains": "text" }     //Text string contains target text
  { "not_contains": "text" } //Text string contains target text
  { "begins_with": "text" }  //Text string begins with target text
  { "ends_with": "text" }    //Text string ends with target text
  { "regex": "text.*" }      //Regex match
  { "equals": "text", "case": "sensitive" } //Default is case sensitive
  { "equals": "text", "case": "insensitive" } //Case insensitive comparison

  //Example usage:
  { "exec": "wait", "text": { "contains": "Target Text" } }
```

#### ELEMENT_SELECTOR
* "SELECTOR"  // Same as { "selector": "SELECTOR" }
```javascript
  { "selector": "SELECTOR" }  //CSS Selector for an element
  { "selector": "SELECTOR", "visible": true }  //Require element to be visible

  //Example usage:
  { "exec": "wait", "element": {"selector": ".targetElement", "visible": true} },
```

#### VALUE_GETTER
```javascript
  { "element": “selector”, "property": "text"  }

  //Example usage:
  { "exec": "set", "variable": "Variable name", "value": { "element": ".targetElement", "property": "text" } }
```
* Optional Parameters:
  * "regex": "ID (.*)"  Parse resulting text, and extract first match
* Property can be: 
  * "text", or any element property, ex. "innerHTML", "clientHeight", etc.


## Examples

#### Configuration for testing a login page
```javascript
{
  "id": "login",
  "title": "Login",
  "commands": [
    { "exec": "navigate", "url": "/" },
    //Put app token into a variable
    { "exec": "set", "variable": "APPTOKEN", "value": { "element": ".loginLink", "property": "href", "regex": "app\\_token=(.*)"  } }, 
    
    { "exec": "navigate", "url": "/login?app_token=@APPTOKEN" },
    // Waits for text to render before continuing
    { "exec": "wait", "text": { "contains": "Please enter username" } },
    { "exec": "screenshot", "id": "Login" },

    { "exec": "input", "element": ".username", "value": "testUser" },
    { "exec": "screenshot", "id": "Username" }, 
    { "exec": "click", "element": ".loginButton" },
  ],
}
```

## Tools
#### jsharmony test recorder
```
jsharmony test recorder
```
* Opens a browser that you can interact with to generate commands.
* Optional flags:
  * --full-element-paths: returns full element paths instead of shortest path
## Release History

* 1.0.0 Initial release