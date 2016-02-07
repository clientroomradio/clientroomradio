module.exports = function(permissionFetcher, logger) {
	var that = this;

	var allowedUsers = [];

	function reloadPermissions() {
		permissionFetcher.fetch(function(err, users) {
			if (err) {
				logger.winston.error("reload permissions", err);
			} else {
				allowedUsers = users;
			}
		});
	}

	reloadPermissions();
	setInterval(reloadPermissions, 60000);

	that.isAllowedToJoin = function(user) {
		return allowedUsers.indexOf(user.toLowerCase()) !== -1;
	};
};
