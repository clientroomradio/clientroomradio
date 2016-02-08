module.exports = function(socket, dataStore, votingManager, logger) {
    var that = this;

    var allowedUsers = dataStore.read("allowedUsers") || [];
    dataStore.record(that, "change", "allowedUsers");

    that.isAllowedToJoin = function(user) {
        return allowedUsers.indexOf(user.toLowerCase()) !== -1;
    };

    that.requestAccess = function(username) {
        votingManager.propose("newUser", null, {"username": username}, function (successful) {
            if (successful) {
                logger.winston.info("adding new user", username);
                allowedUsers.push(username);
                that.emit("change", allowedUsers);
            }
        });
    };
};


require("util").inherits(module.exports, require("events").EventEmitter);
