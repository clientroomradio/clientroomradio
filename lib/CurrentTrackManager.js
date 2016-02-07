module.exports = function(socket, chat, logger) {
    var that = this;

    var currentTrack = {};

    this.setMaxListeners(0);

    var lastIdentifier = null;

    that.getCurrentTrack = function() {
        return currentTrack;
    };

    that.setCurrentTrack = function(newCurrentTrack) {
        currentTrack = newCurrentTrack;
        that.emit("change", newCurrentTrack);

        if (currentTrack.identifier && currentTrack.identifier !== lastIdentifier) {
            lastIdentifier = currentTrack.identifier;
            chat.newTrack(currentTrack);
        }
    };

    that.updateLoveFlag = function(username, loveFlag) {
        logger.winston.info("setting love", username, loveFlag);

        currentTrack.context[username] = currentTrack.context[username] || {
            "username": username,
            "userplaycount": 0
        };
        currentTrack.context[username].userloved = loveFlag;
        that.emit("change", currentTrack);
    };
};

require("util").inherits(module.exports, require("events").EventEmitter);
