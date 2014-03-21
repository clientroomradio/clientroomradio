/**
 * This keeps the frontend updated when data changes
 */
module.exports = function(socket, userDao, currentTrackDao, skippersDao, redis) {
	var that = this;

	userDao.on('change', function(users) {
		socket.broadcast('users', userDao.getFilteredUsers());
	});

	skippersDao.on('change', function(skippers) {
		socket.broadcast('skippers', skippers);
	});

	skippersDao.on('skip', function(skipper, skippers) {
		socket.broadcast('skip', {skipper:skipper, skippers:skippers});
	});

	currentTrackDao.on('change', function(currentTrack) {
		socket.broadcast('newTrack', currentTrack);
	});

	socket.on('join', function(user, send) {
		send('users', userDao.getFilteredUsers());
		send('skippers', skippersDao.getSkippers());
		send('newTrack', currentTrackDao.getCurrentTrack());

		redis.get('discoveryHour', function (err, discoveryHour) {
			discoveryHourOn = (new Date().getTime() - discoveryHour.start < 3600000);
			send('discoveryHour', discoveryHourOn);
		});
	});
}