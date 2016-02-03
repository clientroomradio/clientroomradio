module.exports = function(dataStore) {
	var that = this;
	this.setMaxListeners(0);

	var _ = require("underscore");

	var skippers = dataStore.get("skippers");

	dataStore.on("skippers", function (newSkippers) {
		that.emit("change", newSkippers);

		var skipper = _.without(newSkippers, skippers);

		if (skipper.length === 1 ) {
			var users = dataStore.get("users");
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
		dataStore.set("skippers", newSkippers);
	};
};

require("util").inherits(module.exports, require("events").EventEmitter);
