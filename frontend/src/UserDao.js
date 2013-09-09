module.exports = function(rebus, lastfmClient) {
	var that = this;
	this.setMaxListeners(0);

	var _ = require('underscore');

	var usersNotification = rebus.subscribe('users', function(users) {
 		that.emit('change', users);
  	});

	that.getUsers = function() {
		var users = rebus.value.users;
		if (users == null) {
			users = {}
			that.setUsers(users);
		}
		return users;
	}

	that.setUsers = function(users) {
		rebus.publish('users', users);
	}

	that.setUser = function(user) {
		var users = that.getUsers();
		users[user.username] = user;
		that.setUsers(users);
	}

	function getInfoCallback(err, lfm) {
		if (err) {
			console.log(err);
		}
		else {
			var users = that.getUsers();
			users[lfm.user.name].image = lfm.user.image[2]['#text'];
			that.setUsers(users);
		}
	}

	that.addUser = function(username, sessionId, lastfmSessionKey) {
		var user = {
			'username': username,
			'session': sessionId,
			'sk': lastfmSessionKey, 
			'scrobbling': true,
			'active': true
		};
		that.setUser(user);

		// get some more info about the user
		lastfmClient.userGetInfo(username, getInfoCallback);

		return user;
	}

	that.removeUser = function(user) {
		var users = that.getUsers();
		delete users[user.username];
		that.setUsers(users);
	} 

	that.getUserBySession = function(session) {
		return _.find(that.getUsers(), function(user) { return user.session == session; });
	}

	that.getFilteredUsers = function() {
		// shitty deep clone to filter session keys out
		var users = JSON.parse(JSON.stringify(that.getUsers()));
		_.each(users, function(user, name){ 
			delete(user.sk);
			delete(user.session);
		});
		return users;
	}
}

require('util').inherits(module.exports, require("events").EventEmitter);