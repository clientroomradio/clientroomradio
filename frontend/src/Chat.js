module.exports = function(socket, config) {
	var that = this;

	var _ = require('underscore');

	var backlog = [];

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

	that.userLoved = function(user) {
		that.sendSystemMessage('love', user);
	}

	that.userUnloved = function(user) {
		that.sendSystemMessage('unlove', user);
	}

	that.newTrack = function(track) {
		that.sendSystemMessage('newTrack', null, track.title + ' — ' + track.creator);
	}

	that.spotifyRequest = function(user, request) {
		that.sendSystemMessage('spotifyRequest', user, request);
	}

	that.skipSuccessful = function() {
		that.sendSystemMessage('skipSuccessful', null);
	}

	that.startVote = function(user, type, data, id) {
		that.sendSystemMessage('startVote', user, {
			type: type, 
			data: data, 
			id: id
		});
	}

	that.send = function(data) {
		data.timestamp = new Date().getTime();
		if (backlog.length > config.chatBacklogLength) {
			backlog.splice(0, backlog.length - config.chatBacklogLength);
		}
		socket.broadcast('chat', data, true);
		data.backlog = true;
		backlog.push(data);
	}

	that.sendSystemMessage = function(type, user, text) {
		that.send({
			system: type,
			user: user ? user.username : null,
			text: text
		});
	}
	
	socket.on('chatMessage', function(user, data) {
		that.send({
			user: user ? user.username : null,
			text: data.text
		});
	});

	socket.on('join', function(user, sendToJoiningUser) {
		if (user) {
			_.each(backlog, function(message) {
				sendToJoiningUser('chat', message);
			});
		}
	});

}