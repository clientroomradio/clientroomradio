module.exports = function(dataStore, lastfmClient) {
	var that = this;
	this.setMaxListeners(0);

	var _ = require("underscore");

	dataStore.on("users", function (users) {
		that.emit("change", users);
	});

	that.getUsers = function() {
		return dataStore.get("users");
	};

	that.setUsers = function(newUsers) {
		dataStore.set("users", newUsers);
	};

	that.setUser = function(user) {
		var users = dataStore.get("users");
		users[user.username] = user;
		that.setUsers(users);
	};

	function getInfoCallback(err, lfm) {
		if (err) {
			console.log(err);
		}
		else {
			var users = dataStore.get("users");
			users[lfm.user.name].image = lfm.user.image[2]["#text"];
			that.setUsers(users);
		}
	}

	that.addUser = function(username, sessionId, lastfmSessionKey) {
		var user = {
			"username": username,
			"session": sessionId,
			"sk": lastfmSessionKey,
			"scrobbling": true,
			"active": true
		};
		that.setUser(user);

		// get some more info about the user
		lastfmClient.userGetInfo(username, getInfoCallback);

		return user;
	};

	that.removeUser = function(user) {
		var users = dataStore.get("users");
		delete users[user.username];
		that.setUsers(users);
	};

	that.getUserBySession = function(session) {
		return _.find(that.getUsers(), function(user) { return user.session === session; });
	};

	that.getFilteredUsers = function() {
		// shitty deep clone to filter session keys out
		var filteredUsers = dataStore.get("users");
		_.each(filteredUsers, function (user) {
            delete user.sk;
            delete user.session;
		});
		return filteredUsers;
	};
};

require("util").inherits(module.exports, require("events").EventEmitter);
