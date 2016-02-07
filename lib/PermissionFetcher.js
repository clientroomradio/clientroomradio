module.exports = function(config) {

    var request = require("request");

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
};
