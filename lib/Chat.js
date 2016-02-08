module.exports = function(socket, config) {
    var that = this;

    var backlog = [];

    function send(data) {
        data.timestamp = new Date().getTime();
        if (backlog.length > config.chatBacklogLength) {
            backlog.splice(0, backlog.length - config.chatBacklogLength);
        }
        socket.broadcast("chat", data, true);
        data.backlog = true;
        backlog.push(data);
    }

    function sendSystemMessage(type, user, text, data) {
        send({
            system: type,
            user: user ? user.username : null,
            text: text,
            data: data
        });
    }

    that.userLeft = function(user) {
        sendSystemMessage("left", user);
    };

    that.userTimedOut = function(user) {
        sendSystemMessage("timedOut", user);
    };

    that.newUser = function(user) {
        sendSystemMessage("newUser", user);
    };

    that.userJoined = function(user) {
        sendSystemMessage("join", user);
    };

    that.userSkipped = function(user, message) {
        sendSystemMessage("skip", user, message);
    };

    that.userHasAlreadySkipped = function(user, message) {
        sendSystemMessage("alreadySkipped", user, message);
    };

    that.inactiveUserWantsToSkip = function(user, message) {
        sendSystemMessage("inactiveUserWantsToSkip", user, message);
    };

    that.userLoved = function(user) {
        sendSystemMessage("love", user);
    };

    that.userUnloved = function(user) {
        sendSystemMessage("unlove", user);
    };

    that.newTrack = function(track) {
        sendSystemMessage("newTrack", null, "", track);
    };

    that.spotifyRequest = function(user, track) {
        sendSystemMessage("spotifyRequest", user, "", track);
    };

    that.skipSuccessful = function() {
        sendSystemMessage("skipSuccessful", null);
    };

    that.spotifyRequestComplete = function(track) {
        sendSystemMessage("spotifyRequestComplete", "", "", track);
    };

    that.startVoting = function(user, type, data, id) {
        sendSystemMessage("startVoting", user, "", {
            type: type,
            data: data,
            id: id
        });
    };

    that.userBecomesInactive = function(user, message) {
        sendSystemMessage("becomesInactive", user, message);
    };

    that.userBecomesActive = function(user, message) {
        sendSystemMessage("becomesActive", user, message);
    };

    socket.on("chatMessage", function (user, data) {
        if (data.text.trim().length >0) {
            send({
                user: user ? user.username : null,
                text: data.text
            });
        }
    });

    socket.on("join", function (user, sendToJoiningUser) {
        if (user && user.allowed) {
            backlog.forEach(function (message) {
                sendToJoiningUser("chat", message);
            });
        }
    });
};
