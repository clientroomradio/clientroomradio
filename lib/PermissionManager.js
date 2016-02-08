module.exports = function(socket, dataStore, userDao, votingManager, logger) {
    var that = this;

    var allowedUsers = dataStore.read("allowedUsers") || [];
    dataStore.record(that, "change", "allowedUsers");

    that.isAllowedToJoin = function(user) {
        return allowedUsers.filter(function (allowedUser) {
            return allowedUser.toLowerCase() === user.toLowerCase();
        }).length > 0;
    };

    that.requestAccess = function(username, id) {
        votingManager.propose("newUser", null, {"username": username, "id": id}, function (successful) {

            if (successful) {
                logger.winston.info("adding new user", username);
                allowedUsers.push(username);

                userDao.setAllowedByUsername(username);

                that.emit("change", allowedUsers);
            } else {
                // the user was unsusseful so remove them completely
                userDao.removeByUsername(username);
            }
        });
    };
};


require("util").inherits(module.exports, require("events").EventEmitter);
