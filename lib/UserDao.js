module.exports = function(dataStore, lastfmClient, socket, logger) {
    var that = this;
    this.setMaxListeners(0);

    var uuid = require("node-uuid");

    var users = dataStore.read("users") || {};

    var anonymousDisallowedTypes = ["chat"];

    // the data store will save to file every time we emit a change
    dataStore.record(that, "change", "users");

    function isValidUsername(username) {
        return users.hasOwnProperty(username);
    }

    socket.on("login", function (data, conn) {
        if (data.session !== "") {
            // this user thinks they're logged in
            var user = that.getUserBySession(data.session);

            if (user) {
                // a user in our list has connected
                user.conn = conn;
                user.timestamp = new Date().getTime();
                that.emit("change", users);
                socket.newConnectedUser(user, isValidUsername);
            } else {
                // this user thinks they're already logged in, but
                // they're not in our list so kick them out
                socket.sendToConnection(conn, "disconnected", null);
            }
        } else {
            // this is a logged out anonymous user create a null
            // user to pin their socket connection to
            var fakeSession = uuid.v4();
            user = that.addUser(fakeSession, fakeSession, null, false);
            user.scrobbling = false;
            user.active = false;
            user.conn = conn;
            socket.newConnectedUser(user, isValidUsername);
        }
    });

    // receive heartbeats from the clients
    socket.on("heartbeat", function (user) {
        users[user.username].timestamp = new Date().getTime();
    });

    function checkHeartbeat() {
        var current = new Date().getTime();
        Object.keys(users).forEach(function (username) {
            var user = users[username];

            // if the user hasn't reported anything to us in 30 seconds consider them gone
            if (current - 30000 > user.timestamp) {
                logger.info("removing timed out user", username);
                that.emit("timedOut", users[username]);
                delete users[username];
                that.emit("change", users);
            }
        });
    }

    // check that all the users have told us they're still there in the last 5 seconds
    setInterval(checkHeartbeat, 5000);

    that.getUsers = function() {
        return users;
    };

    that.isRadioUsername = function(username) {
        var user = users[username];
        return user.sk && user.active && user.allowed;
    };

    that.getRadioUsernames = function() {
        return Object.keys(users).filter(function (username) {
            return that.isRadioUsername(username);
        });
    };

    that.getScrobbleUsers = function() {
        return that.getRadioUsernames().filter(function (username) {
            return users[username].scrobbling;
        }).map(function (username) {
            return users[username];
        });
    };

    function getInfoCallback(err, lfm) {
        if (err) {
            logger.error("get info", err);
        } else {
            users[lfm.user.name].image = lfm.user.image[2]["#text"];
            that.emit("change", users);
        }
    }

    function sendStartRadio(oldRadioUsernames) {
        var newRadioUsernames = that.getRadioUsernames();

        if (oldRadioUsernames.length === 0 && newRadioUsernames.length === 1) {
            that.emit("startRadio", newRadioUsernames);
        }
    }

    that.addUser = function(username, sessionId, lastfmSessionKey, allowed) {
        var oldRadioUsernames = that.getRadioUsernames();

        var user = {
            "username": username,
            "session": sessionId,
            "sk": lastfmSessionKey,
            "allowed": allowed,
            "timestamp": new Date().getTime(),
            "conn": null,
            "scrobbling": true,
            "active": true
        };
        users[user.username] = user;
        that.emit("change", users);
        sendStartRadio(oldRadioUsernames);

        // get some more info about the user
        if (lastfmSessionKey) {
            lastfmClient.userGetInfo(username, getInfoCallback);
        }

        return user;
    };

    that.setUsersInactive = function() {
        Object.keys(users).forEach(function (username) {
            users[username].active = false;
        });
        that.emit("change", users);
    };

    that.setUserActive = function(username, active) {
        var oldRadioUsernames = that.getRadioUsernames();
        users[username].active = active;
        sendStartRadio(oldRadioUsernames);
        that.emit("change", users);
    };

    that.setUserScrobbling = function(username, scrobbling) {
        users[username].scrobbling = scrobbling;
        that.emit("change", users);
    };

    that.setAllowedByUsername = function(username) {
        if (users.hasOwnProperty(username)) {
            users[username].allowed = true;
            that.emit("change", users);
            that.emit("allowed", users[username]);
        }
    };

    that.setAnonymousByUsername = function(username) {
        if (users.hasOwnProperty(username)) {
            users[username].sk = null;
            that.emit("change", users);
        }
    };

    that.removeByUsername = function(username) {
        if (users.hasOwnProperty(username)) {
            that.emit("left", users[username]);
            delete users[username];
            that.emit("change", users);
        }
    };

    that.getUserBySession = function(session) {
        var usernames = Object.keys(users).filter(function (username) {
            return users[username].session === session;
        });

        return usernames.length > 0 ? users[usernames[0]] : null;
    };

    that.getFilteredUsers = function() {
        // shitty deep clone to filter session keys out
        var filteredUsers = JSON.parse(JSON.stringify(users, function (key, value) {
            // don't stringify conn, sk, or session
            return ["conn", "sk", "session"].indexOf(key) === -1 ? value : undefined;
        }));

        // now remove the anonymous users
        Object.keys(filteredUsers).forEach(function (username) {
            if (!users[username].sk) {
                delete filteredUsers[username];
            }
        });

        return filteredUsers;
    };

    that.sendToUsername = function(username, type, data) {
        socket.sendToUser(users[username], type, data);
    };

    that.broadcast = function(type, data) {
        Object.keys(users).forEach(function (username) {
            var user = users[username];
            var anonymousAllowedType = anonymousDisallowedTypes.indexOf(type) === -1;
            var userAnonymous = !user.sk || !user.allowed;
            if (anonymousAllowedType || !userAnonymous) {
                // this is a logged in user or the message type can be sent to anyone
                that.sendToUsername(username, type, data);
            }
        });
    };
};

require("util").inherits(module.exports, require("events").EventEmitter);
