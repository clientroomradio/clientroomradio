module.exports = function(userDao, votingManager, socket, config) {
	var that = this;

	var _ = require('underscore');
	var request = require('request');

	socket.on('discoveryHourRequest', function(user) {
		votingManager.propose('discoveryHour', user, {}, function(successful) {
			if (successful) {
				var payload = {};

				request.post(config.discoveryHourRequestUrl, {json:payload}, function (error, response, body) {
					if (error) {
						console.log("ERR", error)
					} else if (response.statusCode != 200) {
						console.log("STATUS CODE != 200: ", response.body);
					} 
				});
			}
		});
	});
}