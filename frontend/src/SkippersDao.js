module.exports = function(rebus) {
	var that = this;
	this.setMaxListeners(0);

	var _ = require('underscore');

	var lastSkippers = [];
	var notification = rebus.subscribe('skippers', function(skippers) {
		that.emit('change', skippers);
		var skipper = _.without(skippers, lastSkippers);

		if ( skipper.length == 1 ) {
	 		that.emit('skip', rebus.value.users[skipper[0]], skippers);
	 	}
 		lastSkippers = skippers;
  	});
	
	that.getSkippers = function() {
		var skippers = rebus.value.skippers;
		if (skippers == null || JSON.stringify(skippers) == '{}') {
			skippers = [];
			that.setSkippers(skippers);
		}
		return skippers;
	}

	that.hasAlreadySkipped = function(user) {
		return (_.find(that.getSkippers(), function(skipper) { return skipper == user.username; }) != undefined);
	}

	that.skip = function(user) {
		var skippers = that.getSkippers();
		skippers.push(user.username);
		that.setSkippers(skippers);
	}

	that.setSkippers = function(skippers) {
		rebus.publish('skippers', skippers);
	}
}

require('util').inherits(module.exports, require("events").EventEmitter);