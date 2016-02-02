module.exports = function (winston) {
    var that = this;

    var fs = require("fs");

    var filename = process.env.HOME + "/.crr.json";

    // setup the data defaults
    var data = {
        votings: {},
        users: {},
        currentTrack: {},
        discoveryHour: {},
        skippers: [],
        tags: [],
        playedTracks: {}
    };

    try {
        if (fs.lstatSync(filename).isFile()) {
            data = JSON.parse(fs.readFileSync(filename, "utf8"));
        }
    }
    catch (e) {
        winston.error(filename + " does not exist", e);
    }

    that.set = function (key, value) {
        data[key] = value;

        fs.writeFile(filename, JSON.stringify(data), function(err) {
            if (err) {
                winston.log("There was an error saving " + filename, err);
            } else {
                winston.log("We saved " + filename);
            }
        });

        that.emit(key, value);
    };

    that.get = function (key) {
        // return a copy
        return JSON.parse(JSON.stringify(data[key]));
    };
};

require("util").inherits(module.exports, require("events").EventEmitter);
