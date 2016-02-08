module.exports = function(userDao, votingManager, socket) {

	socket.on("endOfDayRequest", function (requestUser) {
		votingManager.propose("endOfDay", requestUser, {}, function(successful) {
			if (successful) {
				userDao.setUsersInactive();
			}
		});
	});
};
