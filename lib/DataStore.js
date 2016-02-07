module.exports = function (logger) {
    var that = this;

    var fs = require("fs");

    var filename = process.env.HOME + "/.crr.json";

    // setup the data defaults
    var data = {
        votings: {},
        users: {},
        discoveryHour: {},
        tags: [],
        playedTracks: []
    };

    try {
        if (fs.lstatSync(filename).isFile()) {
            data = JSON.parse(fs.readFileSync(filename, "utf8"));
            logger.winston.info("Read data file", data);
        }
    }
    catch (e) {
        logger.winston.error(filename + " does not exist", e);
    }

    that.set = function (key, value) {
        var oldValue = JSON.parse(JSON.stringify(data[key]));

        data[key] = JSON.parse(JSON.stringify(value));

        fs.writeFile(filename, JSON.stringify(data), function(err) {
            if (err) {
                logger.winston.info("There was an error saving " + filename, err);
            } else {
                logger.winston.info("We saved " + filename);
            }
        });

        // emit a copy of the value passed in
        that.emit(key, JSON.parse(JSON.stringify(value)), oldValue);
    };

    that.get = function (key) {
        // return a copy
        return JSON.parse(JSON.stringify(data[key]));
    };
};

require("util").inherits(module.exports, require("events").EventEmitter);
