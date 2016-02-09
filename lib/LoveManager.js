module.exports = function(socket, currentTrackManager, chat, lastfmClient, logger) {

	function update(user, loveFlag) {
		lastfmClient.setLoveStatus(user, currentTrackManager.getCurrentTrack(), loveFlag, function(err) {
			if (err) {
				logger.winston.error("love update", err);
			} else {
				if (loveFlag) {
					chat.userLoved(user);
				} else {
					chat.userUnloved(user);
				}
				currentTrackManager.updateLoveFlag(user.username, loveFlag ? "1" : "0");
			}
		});
	}

	socket.on("love", function(user) {
		update(user, true);
	});

	socket.on("unlove", function(user) {
		update(user, false);
	});
};
