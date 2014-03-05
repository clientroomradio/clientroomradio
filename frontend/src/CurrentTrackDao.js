module.exports = function(redis, socket) {
	var that = this;

	var _ = require('underscore');

	var currentTrack = {};
	redis.get('currentTrack', function (err, initialCurrentTrack) {
		currentTrack = initialCurrentTrack;
	});

	this.setMaxListeners(0);

	redis.on('currentTrack', function (err, newCurrentTrack) {
		currentTrack = newCurrentTrack;
		that.emit('change', currentTrack);

		// check if discovery hour was set for this track
		redis.get('discoveryHour', function (err, discoveryHour) {
			socket.broadcast('discoveryHour', (new Date().getTime() - discoveryHour.start < 3600000));
		});
	});
	
	that.getCurrentTrack = function() {
		return currentTrack;
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