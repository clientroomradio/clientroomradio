var request = require('request');
var _ = require("underscore");

module.exports = function(config) {
    var that = this;

    this.fetch = function(callback) {
        request(config.whitelistUrl, function (error, response, body) {
            if (error) {
                return callback(error);
            }

            if (response.statusCode !== 200) {
                return callback(new Error("Invalid status code. " + body));
            }

            var users = body.split("\n");
            users = _.map(users, function(user) {
                return user.trim().toLowerCase();
            });
            callback(null, users);
        });
    }
}