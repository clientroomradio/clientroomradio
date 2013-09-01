module.exports = function(rebus) {
	var that = this;
	this.setMaxListeners(0);

	var notification = rebus.subscribe('currentTrack', function(currentTrack) {
 		that.emit('change', currentTrack);
  	});
	
	that.getCurrentTrack = function() {
		return rebus.value.currentTrack || {};
	}
}

require('util').inherits(module.exports, require("events").EventEmitter);