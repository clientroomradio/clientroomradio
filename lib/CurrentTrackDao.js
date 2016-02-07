module.exports = function(socket, logger) {
	var that = this;

	var currentTrack = {};

	this.setMaxListeners(0);

	that.getCurrentTrack = function() {
		return currentTrack;
	};

	that.setCurrentTrack = function(newCurrentTrack) {
		currentTrack = newCurrentTrack;
		that.emit("change", newCurrentTrack);
	};

	that.updateLoveFlag = function(username, loveFlag) {
		logger.winston.info("setting love", username, loveFlag);

		currentTrack.context[username] = currentTrack.context[username] || {
			"username": username,
			"userplaycount": 0
		};
        currentTrack.context[username].userloved = loveFlag;
        that.emit("change", currentTrack);
	};
};

require("util").inherits(module.exports, require("events").EventEmitter);
