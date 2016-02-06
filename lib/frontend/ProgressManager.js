module.exports = function(socket) {
	var that = this;

	that.updateProgress = function(progress) {
		socket.broadcast("progress", progress);
	};
};
