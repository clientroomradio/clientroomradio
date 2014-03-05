module.exports = function(votingManager, socket, redis) {
	var that = this;

	var _ = require('underscore');

	socket.on('discoveryHourRequest', function(user) {
		votingManager.propose('discoveryHour', user, {}, function(successful) {
			if (successful) {
				redis.get('discoveryHour', function(err, discoveryHour) {
					discoveryHour.start =  new Date().getTime();
					redis.set('discoveryHour', discoveryHour);
				});
			}
		});
	});
}