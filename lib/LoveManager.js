module.exports = function(socket, currentTrackManager, chat, lastfmClient, logger) {

	function update(user, loveFlag) {
		logger.info("love updating...", user.username, loveFlag);

		lastfmClient.setLoveStatus(user, currentTrackManager.getCurrentTrack(), loveFlag, function(lfm, err) {
			if (err) {
				logger.error("love update error", user.username, loveFlag, err);
			} else {
				logger.info("love updated", lfm, user.username, loveFlag);

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
