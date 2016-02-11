module.exports = function(socket, chat) {
    var that = this;
    this.setMaxListeners(0);

    var skippers = [];

    socket.on("skip", function (user, data) {
        var text = data.text;
        if (that.hasSkipped(user)) {
            chat.userHasSkipped(user, text);
        } else if (!user.active) {
            chat.inactiveUserWantsToSkip(user, text);
        } else {
            chat.userSkipped(user, text);
            skippers.push(user.username);
            that.emit("change", skippers);
            that.emit("skip", user, skippers);
        }
    });

    that.getSkippers = function() {
        return skippers;
    };

    that.hasSkipped = function(user) {
        return skippers.filter(function (skipper) {
            return skipper === user.username;
        }).length > 0;
    };

    that.clear = function() {
        skippers.length = 0;
        that.emit("change", skippers);
    };
};

require("util").inherits(module.exports, require("events").EventEmitter);
