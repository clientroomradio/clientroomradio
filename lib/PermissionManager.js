module.exports = function(config, logger) {
    var that = this;

    var request = require("request");

    var allowedUsers = [];

    this.fetch = function(callback) {
        request(config.whitelistUrl, function (error, response, body) {
            if (error) {
                return callback(error);
            }

            if (response.statusCode !== 200) {
                return callback(new Error("Invalid status code. " + body));
            }

            var users = body.split("\n");
            users = users.map(function (user) {
                return user.trim().toLowerCase();
            });
            callback(null, users);
        });
    };

    function reloadPermissions() {
        that.fetch(function(err, users) {
            if (err) {
                logger.winston.error("reload permissions", err);
            } else {
                allowedUsers = users;
            }
        });
    }

    reloadPermissions();
    setInterval(reloadPermissions, 60000);

    that.isAllowedToJoin = function(user) {
        return allowedUsers.indexOf(user.toLowerCase()) !== -1;
    };
};
