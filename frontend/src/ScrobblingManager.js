module.exports = function(socket, userDao, chat) {
	var that = this;
	
	socket.on('scrobbleStatus', function(user, newValue) {
		user.scrobbling = newValue ? true : false
		userDao.setUser(user);
		if (user.scrobbling) {
			chat.userScrobbleOn(user);
		} else {
			chat.userScrobbleOff(user);
		}
	});
}