var config = require("../config.js");
var httpServer = require("./http-server.js");
var rebus = require('rebus');

var bus = rebus('../rebus-storage', function(err) {
	console.log('Rebus has been started');
	httpServer.start(config, bus);
});