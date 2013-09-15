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

	socket.on('activeStatus', function(user, newValue) {
		user.active = newValue ? true : false
		userDao.setUser(user);
	});
}