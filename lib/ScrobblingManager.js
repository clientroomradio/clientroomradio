module.exports = function(socket, userDao) {

	socket.on("scrobbleStatus", function (user, newValue) {
		user.scrobbling = newValue ? true : false;
		userDao.setUser(user);
	});
};
