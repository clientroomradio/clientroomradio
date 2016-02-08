module.exports = function(dataStore, lastfmClient, logger) {
	var that = this;
	this.setMaxListeners(0);

	var users = dataStore.read("users") || {};

	// the data store will save to file every time we emit a change
	dataStore.record(that, "change", "users");

	that.getUsers = function() {
		return users;
	};

	that.setUser = function(user) {
		var oldUsers = JSON.parse(JSON.stringify(users));
		users[user.username] = user;
		that.emit("change", users, oldUsers);
	};

	function getInfoCallback(err, lfm) {
		if (err) {
			logger.winston.error("get info", err);
		} else {
			users[lfm.user.name].image = lfm.user.image[2]["#text"];
			that.setUsers(users);
		}
	}

	that.addUser = function(username, sessionId, lastfmSessionKey, allowed) {
		var user = {
			"username": username,
			"session": sessionId,
			"sk": lastfmSessionKey,
			"allowed": allowed,
			"scrobbling": true,
			"active": true
		};
		that.setUser(user);

		// get some more info about the user
		lastfmClient.userGetInfo(username, getInfoCallback);

		return user;
	};

	that.removeUser = function(user) {
		var oldUsers = JSON.parse(JSON.stringify(users));
		delete users[user.username];
		that.emit("change", users, oldUsers);
	};

	that.getUserBySession = function(session) {
		var usernames = Object.keys(users).filter(function (username) {
			return users[username].session === session;
		});

		return usernames.length > 0 ? users[usernames[0]] : null;
	};

	that.getFilteredUsers = function() {
		// shitty deep clone to filter session keys out
		var filteredUsers = JSON.parse(JSON.stringify(users));
		Object.keys(filteredUsers).forEach(function (username) {
            delete filteredUsers[username].sk;
            delete filteredUsers[username].session;
		});
		return filteredUsers;
	};
};

require("util").inherits(module.exports, require("events").EventEmitter);
