module.exports = function(redis, socket) {
	var that = this;

	var _ = require('underscore');

	var currentTrack = {};
	var discoveryHour = false;

	redis.get('currentTrack', function (err, initialCurrentTrack) {
		currentTrack = initialCurrentTrack || {};
		updateState();
		that.emit('change', currentTrack);
	});

	this.setMaxListeners(0);

	redis.on('currentTrack', function (err, newCurrentTrack) {
		currentTrack = newCurrentTrack;
		updateState();
		that.emit('change', currentTrack);
	});

	function updateState() {
		// check if discovery hour was set for this track
		redis.get('discoveryHour', function (err, discoveryHour) {
			discoveryHourOn = (new Date().getTime() - discoveryHour.start < 3600000);
			socket.broadcast('discoveryHour', discoveryHourOn);
		});

		// is it a bingo?
		socket.broadcast('bingo', typeof currentTrack.bingo != 'undefined' && currentTrack.bingo);
	}

	that.getCurrentTrack = function() {
		return currentTrack;
	}

	that.getDiscoveryHour = function() {
		return discoveryHour;
	}

	that.updateLoveFlag = function(username, loveFlag) {
		_.each(currentTrack.context, function(userContext) {
			if (userContext.username == username) {
				userContext.userloved = loveFlag;
			}
		});

		redis.set('currentTrack', currentTrack);
	}
}

require('util').inherits(module.exports, require("events").EventEmitter);