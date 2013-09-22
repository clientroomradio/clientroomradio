module.exports = function(rebus) {
	var that = this;

	var _ = require('underscore');

	this.setMaxListeners(0);

	var notification = rebus.subscribe('currentTrack', function(currentTrack) {
 		that.emit('change', currentTrack);
  	});
	
	that.getCurrentTrack = function() {
		return rebus.value.currentTrack || {};
	}

	that.updateLoveFlag = function(username, loveFlag) {
		var currentTrack = that.getCurrentTrack();
		_.each(currentTrack.context, function(userContext) {
			if (userContext.username == username) {
				userContext.userloved = loveFlag;
			}
		});
		rebus.publish('currentTrack', currentTrack);
	}
}

require('util').inherits(module.exports, require("events").EventEmitter);