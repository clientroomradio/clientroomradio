module.exports = function(socket) {
	var that = this;

	that.userLeft = function(user) {
		that.sendSystemMessage('join', user);
	} 

	that.userTimedOut = function(user) {
		that.sendSystemMessage('timedOut', user);
	} 

	that.userJoined = function(user) {
		that.sendSystemMessage('join', user);
	}

	that.userSkipped = function(user, message) {
		that.sendSystemMessage('skip', user, message);
	}

	that.userHasAlreadySkipped = function(user, message) {
		that.sendSystemMessage('alreadySkipped', user, message);
	}

	that.userScrobbleOn = function(user) {
		that.sendSystemMessage('scrobbleOn', user);
	}

	that.userScrobbleOff = function(user) {
		that.sendSystemMessage('scrobbleOff', user);
	}

	that.userLoved = function(user) {
		that.sendSystemMessage('love', user);
	}

	that.userUnloved = function(user) {
		that.sendSystemMessage('unlove', user);
	}

	that.send = function(data) {
		socket.broadcast('chat', data, true);
	}

	that.sendSystemMessage = function(type, user, text) {
		that.send({
			system: type,
			user: user.username,
			text: text
		});
	}
	
	socket.on('chatMessage', function(user, data) {
		that.send({
			user: user.username,
			text: data.text
		});
	});

}