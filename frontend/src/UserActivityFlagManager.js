module.exports = function(userDao, chat, socket) {
	var that = this;

	var lastActivity = {};

	var _ = require('underscore');

	userDao.on('change', function(users) {
		var newActivity = {};
		_.each(users, function(user) { newActivity[user.username] = user.active; });

		// compare the last state with the current one
		_.each(newActivity, function(active, username) {
			if (lastActivity.hasOwnProperty(username)) {
				if (lastActivity[username] != active) {
					if (lastActivity[username]) {
						chat.userBecomesInactive(users[username]);
					} else {
						chat.userBecomesActive(users[username]);
					}
				}
			}
		});

		lastActivity = newActivity;
	});

	socket.on('activeStatus', function(user, data) {
		var newValue = data.status ? true : false;
		var message = data.message;
		if (user.active != newValue) {
			user.active = newValue ;
			if (newValue) {
				chat.userBecomesActive(user, message);
			} else {
				chat.userBecomesInactive(user, message);
			}
			lastActivity[user.username] = newValue;
			userDao.setUser(user);
		}
	});
}