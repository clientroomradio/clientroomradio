"use strict";

var winston = require("winston");

winston.add(winston.transports.File, { filename: "/var/log/crr.winston.log"});
winston.remove(winston.transports.Console);
winston.add(winston.transports.Console, { timestamp: true });

module.exports = class Logger {
    info() {
        winston.info.apply(this, arguments);
    };

    error() {
        winston.error.apply(this, arguments);
    };

    log() {
        winston.log.apply(this, arguments);
    };
};
