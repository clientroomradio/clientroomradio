module.exports = function(dataStore, userDao, votingManager, chat, socket, lastfmClient, config, logger) {
    var that = this;

    var uuid = require("node-uuid");

    var allowedUsers = dataStore.read("allowedUsers") || [];
    dataStore.record(that, "change", "allowedUsers");

    socket.on("token", function (token, conn) {
        lastfmClient.login(token, function (err, session) {
            if (err) {
                logger.error("login", err);
            } else {
                var sessionId = uuid.v4();
                var allowed = that.isAllowedToJoin(session.user);
                var user = userDao.addUser(session.user, sessionId, session.key, allowed);
                user.conn = conn;

                if (allowed) {
                    chat.userJoined(user);
                } else {
                    // start a vote to see if people want them in
                    that.requestAccess(session.user, sessionId);
                }

                socket.newLoggedInUser(user);
            }
        });
    });

    that.isAllowedToJoin = function(user) {
        if (config.whitelist) {
            return allowedUsers.filter(function (allowedUser) {
                return allowedUser.toLowerCase() === user.toLowerCase();
            }).length > 0;
        }

        return true;
    };

    that.requestAccess = function(username, id) {
        votingManager.propose("newUser", null, {"username": username, "id": id}, function (successful) {

            if (successful) {
                logger.info("adding new user", username);
                allowedUsers.push(username);

                userDao.setAllowedByUsername(username);

                that.emit("change", allowedUsers);
                chat.newUser(userDao.getUsers()[username]);
            } else {
                // the user was unsuccessful so remove them completely
                userDao.setAnonymousByUsername(username);
            }
        });
    };
};


require("util").inherits(module.exports, require("events").EventEmitter);
