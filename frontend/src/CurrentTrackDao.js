module.exports = function(redis) {
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