module.exports = function(dataStore, lastfmClient, logger) {
    var that = this;
    this.setMaxListeners(0);

    var users = dataStore.read("users") || {};

    // the data store will save to file every time we emit a change
    dataStore.record(that, "change", "users");

    that.getUsers = function() {
        return users;
    };

    that.getRadioUsernames = function() {
        return Object.keys(users).filter(function (username) {
            return users[username].active && users[username].allowed;
        });
    };

    function getInfoCallback(err, lfm) {
        if (err) {
            logger.winston.error("get info", err);
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
            "scrobbling": true,
            "active": true
        };
        users[user.username] = user;
        that.emit("change", users);
        sendStartRadio(oldRadioUsernames);

        // get some more info about the user
        lastfmClient.userGetInfo(username, getInfoCallback);

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
        }
    };

    that.removeByUsername = function(username) {
        if (users.hasOwnProperty(username)) {
            that.emit("removing", users[username]);
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
        var filteredUsers = JSON.parse(JSON.stringify(users));
        Object.keys(filteredUsers).forEach(function (username) {
            delete filteredUsers[username].sk;
            delete filteredUsers[username].session;
        });
        return filteredUsers;
    };
};

require("util").inherits(module.exports, require("events").EventEmitter);
