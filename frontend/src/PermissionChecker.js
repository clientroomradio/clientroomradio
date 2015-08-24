module.exports = function(permissionFetcher) {
	var that = this;

	var _ = require('underscore');

	var allowedUsers = [];

	function reloadPermissions() {
		permissionFetcher.fetch(function(err, users) {
			if (err) {
				console.log("Error: " + err);
			} else {
				allowedUsers = users;
			}
		});
	}

	reloadPermissions();
	setInterval(reloadPermissions, 60000);

	that.isAllowedToJoin = function(user) {
		return _.contains(allowedUsers, user);
	}
}