var DataStore = require("./shared/src/DataStore.js");
var dataStore = new DataStore(console);

var Frontend = require("./frontend/app.js");
var frontend = new Frontend(dataStore);

var Backend = require("./backend/backend.js");
var backend = new Backend(dataStore);
