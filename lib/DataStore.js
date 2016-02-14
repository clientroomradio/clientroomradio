module.exports = function (logger) {
    var that = this;

    var fs = require("fs");
    var path = require("path");

    function getFilename(name) {
        return path.join(process.env.HOME, ".crr", name + ".json");
    }

    that.record = function (object, event, name) {
        object.on(event, function (data) {
            var filename = getFilename(name);

            fs.writeFile(filename, JSON.stringify(data, function(key, value) {
                // don't include connection
                return key === "conn" ? undefined : value;
            }), function(err) {
                if (err) {
                    logger.winston.info("There was an error saving " + filename, err);
                } else {
                    logger.winston.info("We saved " + filename);
                }
            });
        });
    };

    that.read = function (name) {
        var filename = getFilename(name);
        try {
            if (fs.lstatSync(filename).isFile()) {
                logger.winston.info("reading file", filename);
                return JSON.parse(fs.readFileSync(filename, "utf8"));
            }
        } catch (e) {
            logger.winston.error("error reading", filename, e);
        }

        return null;
    };
};
