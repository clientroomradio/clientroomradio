module.exports = function(userDao, votingManager, socket) {
	var that = this;

	var _ = require('underscore');

	socket.on('endOfDayRequest', function(user) {
		votingManager.propose('endOfDay', user, {}, function(successful) {
			if (successful) {
				var users = userDao.getUsers();
				_.each(users, function(user) {
					user.active = false;
				});
				userDao.setUsers(users);
			}
		});
	});
}