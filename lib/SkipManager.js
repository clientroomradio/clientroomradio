"use strict";

var events = require("events");

module.exports = class SkipManager extends events.EventEmitter {
    constructor(userDao, socket, chat) {
        super();

        this.setMaxListeners(0);

        this.userDao = userDao;

        this.data = {
            skippers: [],
            skipLimit: this.getSkipLimit()
        };

        userDao.on("change", (users) => {
            this.data.skipLimit = this.getSkipLimit();
            this.emit("change", this.data);
        });

        socket.on("skip", (user, data) => {
            var text = data.text;
            if (this.hasSkipped(user)) {
                chat.userHasAlreadySkipped(user, text);
            } else if (!user.active) {
                chat.inactiveUserWantsToSkip(user, text);
            } else {
                chat.userSkipped(user, text);
                this.data.skippers.push(user.username);
                this.emit("change", this.data);
                this.emit("skip", user, text);
            }
        });
    }

    getSkipLimit() {
        return Math.ceil(this.userDao.getRadioUsernames().length / 2);
    }

    getSkippers() {
        return this.data.skippers;
    };

    getData() {
        return this.data;
    }

    hasSkipped(user) {
        return this.data.skippers.filter(skipper => {
            return skipper === user.username;
        }).length > 0;
    };

    clear() {
        this.data.skippers.length = 0;
        this.emit("change", this.data);
    };
};

