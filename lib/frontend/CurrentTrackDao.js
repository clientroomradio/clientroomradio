module.exports = function(dataStore, socket) {
	var that = this;

	var discoveryHour = false;
	var CURRENT_TRACK_KEY = "currentTrack";
	var DISCOVERY_HOUR_KEY = "discoveryHour";

    updateState();

	this.setMaxListeners(0);

	dataStore.on(CURRENT_TRACK_KEY, function (newCurrentTrack) {
        updateState();
		that.emit("change", newCurrentTrack);
	});

	function updateState() {
		// check if discovery hour was set for this track
		var discoveryHourData = dataStore.get(DISCOVERY_HOUR_KEY);
        discoveryHour = (new Date().getTime() - discoveryHourData.start < 3600000);
		socket.broadcast(DISCOVERY_HOUR_KEY, discoveryHour);

		// is it a bingo?
		var bingo = dataStore.get(CURRENT_TRACK_KEY).bingo;
		socket.broadcast("bingo", typeof bingo !== "undefined" && bingo);
	}

	that.getCurrentTrack = function() {
		return dataStore.get(CURRENT_TRACK_KEY);
	};

	that.getDiscoveryHour = function() {
		return discoveryHour;
	};

	that.updateLoveFlag = function(username, loveFlag) {
		var currentTrack = dataStore.get(CURRENT_TRACK_KEY);

		console.info("setting love", username, loveFlag);

		currentTrack.context[username] = currentTrack.context[username] || {
			"username": username,
			"userplaycount": 0
		};
        currentTrack.context[username].userloved = loveFlag;

		dataStore.set(CURRENT_TRACK_KEY, currentTrack);
	};
};

require("util").inherits(module.exports, require("events").EventEmitter);
