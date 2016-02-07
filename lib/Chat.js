module.exports = function(socket, config) {
	var that = this;

	var backlog = [];

	that.userLeft = function(user) {
		that.sendSystemMessage("left", user);
	};

	that.userTimedOut = function(user) {
		that.sendSystemMessage("timedOut", user);
	};

	that.userJoined = function(user) {
		that.sendSystemMessage("join", user);
	};

	that.userSkipped = function(user, message) {
		that.sendSystemMessage("skip", user, message);
	};

	that.userHasAlreadySkipped = function(user, message) {
		that.sendSystemMessage("alreadySkipped", user, message);
	};

	that.inactiveUserWantsToSkip = function(user, message) {
		that.sendSystemMessage("inactiveUserWantsToSkip", user, message);
	};

	that.userLoved = function(user) {
		that.sendSystemMessage("love", user);
	};

	that.userUnloved = function(user) {
		that.sendSystemMessage("unlove", user);
	};

	that.newTrack = function(track) {
		that.sendSystemMessage("newTrack", null, "", track);
	};

	that.spotifyRequest = function(user, track) {
		that.sendSystemMessage("spotifyRequest", user, "", track);
	};

	that.skipSuccessful = function() {
		that.sendSystemMessage("skipSuccessful", null);
	};

	that.spotifyRequestComplete = function(track) {
		that.sendSystemMessage("spotifyRequestComplete", "", "", track);
	};

	that.startVoting = function(user, type, data, id) {
		that.sendSystemMessage("startVoting", user, "", {
			type: type,
			data: data,
			id: id
		});
	};

	that.userBecomesInactive = function(user, message) {
		that.sendSystemMessage("becomesInactive", user, message);
	};

	that.userBecomesActive = function(user, message) {
		that.sendSystemMessage("becomesActive", user, message);
	};

	that.send = function(data) {
		data.timestamp = new Date().getTime();
		if (backlog.length > config.chatBacklogLength) {
			backlog.splice(0, backlog.length - config.chatBacklogLength);
		}
		socket.broadcast("chat", data, true);
		data.backlog = true;
		backlog.push(data);
	};

	that.sendSystemMessage = function(type, user, text, data) {
		that.send({
			system: type,
			user: user ? user.username : null,
			text: text,
			data: data
		});
	};

	socket.on("chatMessage", function (user, data) {
		that.send({
			user: user ? user.username : null,
			text: data.text
		});
	});

	socket.on("join", function (user, sendToJoiningUser) {
		if (user) {
			backlog.forEach(function (message) {
				sendToJoiningUser("chat", message);
			});
		}
	});
};
