module.exports = function(socket, dataStore, userDao, config) {
    var that = this;

    var backlog = dataStore.read("chat") || [];

    dataStore.record(that, "change", "chat");

    function send(data) {
        data.timestamp = new Date().getTime();
        if (backlog.length > config.chatBacklogLength) {
            backlog.splice(0, backlog.length - config.chatBacklogLength);
        }
        userDao.broadcast("chat", data, true);
        data.backlog = true;
        backlog.push(data);

        that.emit("change", backlog);
    }

    function getSystemMessageData(type, username, text, data) {
        return {
            system: type,
            user: username,
            text: text,
            data: data
        };
    }

    function sendSystemMessage(type, username, text, data) {
        send(getSystemMessageData(type, username, text, data));
    }

    that.getBacklog = function() {
        return backlog;
    };

    that.userLeft = function(user) {
        sendSystemMessage("left", user.username);
    };

    that.userTimedOut = function(user) {
        sendSystemMessage("timedOut", user.username);
    };

    that.newUser = function(user) {
        sendSystemMessage("newUser", user.username);
    };

    that.userJoined = function(user) {
        sendSystemMessage("join", user.username);
    };

    that.userSkipped = function(user, message) {
        sendSystemMessage("skip", user.username, message);
    };

    that.userHasAlreadySkipped = function(user, message) {
        sendSystemMessage("alreadySkipped", user.username, message);
    };

    that.inactiveUserWantsToSkip = function(user, message) {
        sendSystemMessage("inactiveUserWantsToSkip", user.username, message);
    };

    that.userLoved = function(user) {
        sendSystemMessage("love", user.username);
    };

    that.userUnloved = function(user) {
        sendSystemMessage("unlove", user.username);
    };

    that.newTrack = function(track) {
        sendSystemMessage("newTrack", null, "", track);
    };

    that.spotifyRequest = function(user, track) {
        sendSystemMessage("spotifyRequest", user.username, "", track);
    };

    that.skipSuccessful = function(skippers) {
        sendSystemMessage("skipSuccessful", null, "", skippers);
    };

    that.spotifyRequestComplete = function(track) {
        sendSystemMessage("spotifyRequestComplete", "", "", track);
    };

    that.startVoting = function(user, type, data, id) {
        sendSystemMessage("startVoting", user ? user.username : null, "", {
            type: type,
            data: data,
            id: id
        });
    };

    that.userBecomesInactive = function(user, message) {
        sendSystemMessage("becomesInactive", user.username, message);
    };

    that.userBecomesActive = function(user, message) {
        sendSystemMessage("becomesActive", user.username, message);
    };

    that.clear = function(user) {
        userDao.sendToUsername(user.username, "chat", getSystemMessageData("clear", user.username));
    };

    socket.on("chatMessage", function (user, data) {
        if (data.text.trim().length > 0) {
            send({
                user: user ? user.username : null,
                text: data.text
            });
        }
    });
};

require("util").inherits(module.exports, require("events").EventEmitter);
