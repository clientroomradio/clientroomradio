
module.exports = function(config) {
    var that = this;

    var winston = require("winston");

    winston.add(winston.transports.File, { filename: "/var/log/crr.winston.log"});
    winston.remove(winston.transports.Console);
    winston.add(winston.transports.Console, { timestamp: true });

    that.info = function () {
        winston.info.apply(this, arguments);
    };

    that.error = function () {
        winston.error.apply(this, arguments);
    };

    that.log = function () {
        winston.log.apply(this, arguments);
    };
};
