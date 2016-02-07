module.exports = function(socket, currentTrackDao, chat, lastfmClient, logger) {

	function update(user, loveFlag) {
		lastfmClient.setLoveStatus(user, currentTrackDao.getCurrentTrack(), loveFlag, function(err) {
			if (err) {
				logger.winston.error("love update", err);
			} else {
				if (loveFlag) {
					chat.userLoved(user);
				}
				else {
					chat.userUnloved(user);
				}
			}
		});
		currentTrackDao.updateLoveFlag(user.username, loveFlag);
	}

	socket.on("love", function(user) {
		update(user, true);
	});

	socket.on("unlove", function(user) {
		update(user, false);
	});
};
