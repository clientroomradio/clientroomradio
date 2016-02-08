module.exports = function(socket, userDao) {

	socket.on("scrobbleStatus", function (user, newValue) {
		userDao.setUserScrobbling(user.username, newValue);
	});
};
