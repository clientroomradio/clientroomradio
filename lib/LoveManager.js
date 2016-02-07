module.exports = function(socket, currentTrackDao, chat, lastfmClient) {

	function update(user, loveFlag) {
		lastfmClient.setLoveStatus(user, currentTrackDao.getCurrentTrack(), loveFlag, function(err) {
			if (err) {
				console.log("Error: " + err);
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
