module.exports = function(currentTrackDao, chat) {
	var that = this;

	currentTrackDao.on('change', function(track) {
		if (track.creator) {
			chat.newTrack(track);
		}
	});
}