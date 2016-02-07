module.exports = function (socket, chat, userDao) {
	var that = this;

	var lastHeartbeat = {};

	that.start = function() {
		setInterval(function() {
			var current = new Date().getTime();
			Object.keys(lastHeartbeat).forEach(function (username) {
				var user = lastHeartbeat[username].user;
				var timestamp = lastHeartbeat[username].timestamp;
				if (current - 10000 > timestamp) {
					delete lastHeartbeat[username];
					userDao.removeUser(user);
					chat.userTimedOut(user);
				}
			});
		}, 10000);
	};

	socket.on("heartbeat", function(user) {
		lastHeartbeat[user.username] = {
			timestamp: new Date().getTime(),
			user: user
		};
	});
};
