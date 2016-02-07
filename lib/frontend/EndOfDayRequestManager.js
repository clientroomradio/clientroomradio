module.exports = function(userDao, votingManager, socket) {

	socket.on("endOfDayRequest", function (requestUser) {
		votingManager.propose("endOfDay", requestUser, {}, function(successful) {
			if (successful) {
				var users = userDao.getUsers();
				users.forEach(function (user) {
					user.active = false;
				});
				userDao.setUsers(users);
			}
		});
	});
};
