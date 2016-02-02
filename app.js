var Redis = require("./shared/src/redis.js");
var redis = new Redis(console);

var Frontend = require("./frontend/app.js");
var frontend = new Frontend(redis);

var Backend = require("./backend/backend.js");
var backend = new Backend(redis);
