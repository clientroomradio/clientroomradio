module.exports = function(socket, config, logger) {
	var that = this;

    var http = require("http");

	that.start = function() {
		var httpServer = http.createServer();
		socket.getSockJs().installHandlers(httpServer, {prefix: "/sockjs"});
		httpServer.listen(config.port);
		logger.info("Listening externally on port %s", config.port);
	};
};
