module.exports = function(userDao, chat, socket) {
	var lastActivity = {};

	userDao.on("change", function(users) {
		var newActivity = {};
		Object.keys(users).forEach(function (username) {
			newActivity[username] = users[username].active;
		});

		// compare the last state with the current one
		Object.keys(newActivity).forEach(function (username) {
			if (lastActivity.hasOwnProperty(username)) {
				if (lastActivity[username] !== newActivity[username].active) {
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

	socket.on("activeStatus", function (user, data) {
		var newValue = data.status ? true : false;
		var message = data.message;
		if (user.active !== newValue) {
			user.active = newValue;
			if (newValue) {
				chat.userBecomesActive(user, message);
			} else {
				chat.userBecomesInactive(user, message);
			}
			lastActivity[user.username] = newValue;
			userDao.setUser(user);
		}
	});
};
