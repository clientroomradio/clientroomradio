
module.exports = function(config) {
    var that = this;

    that.winston = require("winston");

    that.winston.add(that.winston.transports.File, { filename: config.logFile });
    that.winston.remove(that.winston.transports.Console);
    that.winston.add(that.winston.transports.Console, { timestamp: true });
};
