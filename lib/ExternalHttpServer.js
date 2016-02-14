module.exports = function(expressExternal, socket, config, logger) {
	var that = this;

	that.start = function() {
		var httpServer = require("http").createServer(expressExternal.getApp());
		socket.getSockJs().installHandlers(httpServer, {prefix: "/sockjs"});
		httpServer.listen(config.port);
		logger.info("Listening externally on port %s", config.port);
	};
};
