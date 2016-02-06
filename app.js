var DataStore = require("./lib/shared/DataStore.js");
var dataStore = new DataStore(console);

var Frontend = require("./lib/frontend/Frontend.js");
var frontend = new Frontend(dataStore);

var Backend = require("./lib/backend/Backend.js");
var backend = new Backend(dataStore);
