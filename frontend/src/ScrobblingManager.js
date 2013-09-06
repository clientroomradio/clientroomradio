module.exports = function(socket, userDao, chat) {
	var that = this;
	
	socket.on('scrobbleStatus', function(user, newValue) {
		user.scrobbling = newValue ? true : false
		userDao.setUser(user);
	});
}