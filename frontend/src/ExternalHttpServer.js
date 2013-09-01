module.exports = function(expressExternal, socket, config) {
	var that = this;

	that.start = function() {
		var httpServer = require('http').createServer(expressExternal.getApp());
		socket.getSockJs().installHandlers(httpServer , {prefix:'/sockjs'});
		httpServer.listen(config.frontendPort);
		console.log('Listening externally on port %s', config.frontendPort);
	}
	
}