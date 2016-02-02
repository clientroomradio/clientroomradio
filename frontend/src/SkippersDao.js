module.exports = function(redis) {
	var that = this;
	this.setMaxListeners(0);

	var _ = require("underscore");

	var skippers = redis.get("skippers");

	redis.on("skippers", function (newSkippers) {
		that.emit("change", newSkippers);

		var skipper = _.without(newSkippers, skippers);

		if (skipper.length === 1 ) {
			var users = redis.get("users");
			that.emit("skip", users[skipper[0]], newSkippers);
		}

		skippers = newSkippers;
	});

	that.getSkippers = function() {
		return skippers;
	};

	that.hasAlreadySkipped = function(user) {
		return (_.find(that.getSkippers(), function(skipper) { return skipper === user.username; }) !== undefined);
	};

	that.skip = function(user) {
		skippers.push(user.username);
		that.setSkippers(skippers);
	};

	that.setSkippers = function(newSkippers) {
		redis.set("skippers", newSkippers);
	};
};

require("util").inherits(module.exports, require("events").EventEmitter);
