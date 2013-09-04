module.exports = function(currentTrackDao, chat) {
	var that = this;

	var lastIdentifier = null;

	currentTrackDao.on('change', function(track) {
		if (track.identifier && track.identifier != lastIdentifier) {
			lastIdentifier = track.identifier;
			chat.newTrack(track);
		}
	});
}