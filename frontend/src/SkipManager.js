module.exports = function(socket, skippersDao, chat) {
	var that = this;
	
	socket.on('skip', function(user, data) {
		var text = data.text;
		if (skippersDao.hasAlreadySkipped(user)) {
			chat.userHasAlreadySkipped(user, text);
		} else {
			skippersDao.skip(user);
			chat.userSkipped(user, text);
		}
		
	});
}