module.exports = function (internal, external) {
    var that = this;

    var redis = require('redis');

    var client = redis.createClient();

    client.on('ready', function () {
        console.log("client ready");

        client.on("error", function (err) {
            console.log("client error " + err);
        });

        var sclient = redis.createClient();

        sclient.on('ready', function () {
            that.emit('ready');

            sclient.on("error", function (err) {
                console.log("sclient error " + err);
            });
            
            sclient.on('subscribe', function (channel, count) {
                console.log('redis_sclient subscribed to ' + channel);
            });

            // emit events when we get messages
            sclient.on("message", function (channel, message) {
                that.get(message, function (err, value) {
                    that.emit(message, err, value);
                });
                
            });

            sclient.subscribe('backend');
        });
    });

    that.set = function (key, value, callback) {
        client.set(key, JSON.stringify(value), function (err, reply) {
            client.publish('frontend', key);
            client.publish('backend', key);

            if (typeof callback === 'undefined') {
                redis.print(err, reply)
            } else {
                callback(err, reply);
            }
        });
    }

    that.get = function (key, callback) {
        client.get(key, function(err, reply) {
            if (typeof callback === 'undefined') {
                redis.print(err, reply)
            } else {
                callback(err, JSON.parse(reply));
            }
        });
    }
}

require('util').inherits(module.exports, require("events").EventEmitter);
