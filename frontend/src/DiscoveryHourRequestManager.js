module.exports = function(votingManager, socket, dataStore) {

	socket.on("discoveryHourRequest", function(user) {
		votingManager.propose("discoveryHour", user, {}, function(successful) {
			if (successful) {
				var discoveryHour = dataStore.get("discoveryHour");
				discoveryHour.start = new Date().getTime();
				dataStore.set("discoveryHour", discoveryHour);
			}
		});
	});
};
