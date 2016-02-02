module.exports = function(votingManager, socket, redis) {

	socket.on("discoveryHourRequest", function(user) {
		votingManager.propose("discoveryHour", user, {}, function(successful) {
			if (successful) {
				var discoveryHour = redis.get("discoveryHour");
				discoveryHour.start = new Date().getTime();
				redis.set("discoveryHour", discoveryHour);
			}
		});
	});
};
