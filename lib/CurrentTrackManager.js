"use strict";

var events = require("events");

module.exports = class CurrentTrackManager extends events.EventEmitter {
    constructor(socket, chat, logger) {
        super();

        this.socket = socket;
        this.chat = chat;
        this.logger = logger;

        this.currentTrack = {};
        this.lastIdentifier = null;

        this.setMaxListeners(0);
    }

    getCurrentTrack() {
        return this.currentTrack;
    };

    setCurrentTrack(newCurrentTrack) {
        this.currentTrack = newCurrentTrack;
        this.emit("change", newCurrentTrack);

        if (this.currentTrack.identifier && this.currentTrack.identifier !== this.lastIdentifier) {
            this.lastIdentifier = this.currentTrack.identifier;
            this.chat.newTrack(this.currentTrack);
        }
    };

    updateLoveFlag(username, loveFlag) {
        this.logger.info("setting love", username, loveFlag);

        this.currentTrack.context[username] = this.currentTrack.context[username] || {
            "username": username,
            "userplaycount": 0
        };
        this.currentTrack.context[username].userloved = loveFlag;
        this.emit("change", this.currentTrack);
    };
};


