module.exports = function(dataStore) {
	var that = this;
	this.setMaxListeners(0);

	dataStore.on("skippers", function (skippers, oldSkippers) {
		that.emit("change", skippers);

		var newSkippers = skippers.filter(function (skipper) {
			return oldSkippers.filter(function (oldSkipper) {
				return oldSkipper === skipper;
			}).length > 0;
		});

		if (newSkippers.length === 1) {
			var users = dataStore.get("users");
			that.emit("skip", users[newSkippers[0]], skippers);
		}
	});

	that.getSkippers = function() {
		return dataStore.get("skippers");
	};

	that.hasAlreadySkipped = function(user) {
		return that.getSkippers().filter(function (skipper) {
			return skipper === user.username;
		}).length > 0;
	};

	that.skip = function(user) {
		var skippers = dataStore.get("skippers");
		skippers.push(user.username);
		that.setSkippers(skippers);
	};

	that.setSkippers = function(newSkippers) {
		dataStore.set("skippers", newSkippers);
	};
};

require("util").inherits(module.exports, require("events").EventEmitter);
