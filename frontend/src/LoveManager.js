module.exports = function(socket, currentTrackDao, chat, lastfmClient) {
	var that = this;
	
	function update(user, unloveFlag) {
		lastfmClient.setLoveStatus(user, currentTrackDao.getCurrentTrack(), !unloveFlag, function(err) {
			if (err) {
				console.log("Error: " + err);
			} else {
				if (unloveFlag) {
					chat.userUnloved(user);
				}
				else {
					chat.userLoved(user);
				}
			}
		});
		currentTrackDao.updateLoveFlag(user.username, !unloveFlag);
	}

	socket.on('love', function(user) {
		update(user, false);
	});

	socket.on('unlove', function(user) {
		update(user, true);
	});
}