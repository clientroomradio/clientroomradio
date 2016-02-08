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

            var users = userDao.getUsers();

            if (successful) {
                logger.winston.info("adding new user", username);
                allowedUsers.push(username);

                if (users.hasOwnProperty(username)) {
                    users[username].allowed = true;
                    userDao.setUser(users[username]);
                }

                that.emit("change", allowedUsers);
            } else if (users.hasOwnProperty(username)) {
                // the user was unsusseful so remove them completely
                userDao.removeUser(users[username]);
            }
        });
    };
};


require("util").inherits(module.exports, require("events").EventEmitter);
