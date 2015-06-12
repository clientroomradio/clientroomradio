module.exports = function (socket, chat, userDao) {
	var that = this;

	var _ = require("underscore");

	var lastHeartbeat = {};

	that.start = function() {
		setInterval(function() {
			var current = new Date().getTime();
			_.each(lastHeartbeat, function(data, username) {
				var user = data.user;
				var timestamp = data.timestamp;
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
