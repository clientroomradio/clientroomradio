"use strict";

var events = require("events");

module.exports = class SkipManager extends events.EventEmitter {
    constructor(socket, chat) {
        super();

        this.setMaxListeners(0);

        this.skippers = [];

        socket.on("skip", (user, data) => {
            var text = data.text;
            if (this.hasSkipped(user)) {
                chat.userHasAlreadySkipped(user, text);
            } else if (!user.active) {
                chat.inactiveUserWantsToSkip(user, text);
            } else {
                chat.userSkipped(user, text);
                this.skippers.push(user.username);
                this.emit("change", this.skippers);
                this.emit("skip", user, this.skippers);
            }
        });
    }

    getSkippers() {
        return this.skippers;
    };

    hasSkipped(user) {
        return this.skippers.filter(skipper => {
            return skipper === user.username;
        }).length > 0;
    };

    clear() {
        this.skippers.length = 0;
        this.emit("change", this.skippers);
    };
};

