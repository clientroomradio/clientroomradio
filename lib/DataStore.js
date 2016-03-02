"use strict";

var fs = require("fs");

module.exports = class DataStore {
    constructor(logger) {
        this.logger = logger;
    }

    static getFilename(name) {
        return "/var/crr/data/" + name + ".json";
    }

    record(object, event, name) {
        object.on(event, (data) => {
            var filename = DataStore.getFilename(name);

            fs.writeFile(filename, JSON.stringify(data, function(key, value) {
                // don't include connection
                return key === "conn" ? undefined : value;
            }), (err) => {
                if (err) {
                    this.logger.info("There was an error saving " + filename, err);
                } else {
                    this.logger.info("We saved " + filename);
                }
            });
        });
    };

    read(name) {
        var filename = DataStore.getFilename(name);
        try {
            if (fs.lstatSync(filename).isFile()) {
                this.logger.info("reading file", filename);
                return JSON.parse(fs.readFileSync(filename, "utf8"));
            }
        } catch (e) {
            this.logger.error("error reading", filename, e);
        }

        return null;
    };
};
