module.exports = function(socket, currentTrackDao, chat, lastfmClient) {
	var that = this;
	
	socket.on('love', function(user) {
		lastfmClient.setLoveStatus(user, currentTrackDao.getCurrentTrack(), true, function(err) {
			if (err) {
				console.log("Error: " + err);
			} else {
				chat.userLoved(user);
			}
		});
	});

	socket.on('unlove', function(user, data) {
		lastfmClient.setLoveStatus(user, currentTrackDao.getCurrentTrack(), true, function(err) {
			if (err) {
				console.log("Error: " + err);
			} else {
				chat.userUnloved(user);
			}
		});
	});
}