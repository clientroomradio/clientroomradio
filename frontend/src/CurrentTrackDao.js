module.exports = function(dataStore, socket) {
	var that = this;

	var _ = require("underscore");

	var currentTrack = dataStore.get("currentTrack");
	var discoveryHour = false;

    updateState();

	this.setMaxListeners(0);

	dataStore.on("currentTrack", function (newCurrentTrack) {
		currentTrack = newCurrentTrack;
        updateState();
		that.emit("change", currentTrack);
	});

	function updateState() {
		// check if discovery hour was set for this track
		var discoveryHourData = dataStore.get("discoveryHour");
        discoveryHour = (new Date().getTime() - discoveryHourData.start < 3600000);
		socket.broadcast("discoveryHour", discoveryHour);

		// is it a bingo?
		socket.broadcast("bingo", typeof currentTrack.bingo !== "undefined" && currentTrack.bingo);
	}

	that.getCurrentTrack = function() {
		return currentTrack;
	};

	that.getDiscoveryHour = function() {
		return discoveryHour;
	};

	that.updateLoveFlag = function(username, loveFlag) {
		_.each(currentTrack.context, function(userContext) {
			if (userContext.username === username) {
				userContext.userloved = loveFlag;
			}
		});

		dataStore.set("currentTrack", currentTrack);
	};
};

require("util").inherits(module.exports, require("events").EventEmitter);
