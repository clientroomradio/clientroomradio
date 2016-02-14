module.exports = function(logger) {
    var that = this;
    this.setMaxListeners(0);

    var sockjs = require("sockjs").createServer();

    function jsonParse(dataAsString) {
        try {
            return JSON.parse(dataAsString);
        } catch (err) {
            logger.error("client sent bad JSON", dataAsString, err);
        }

        return null;
    }

    sockjs.on("connection", function (conn) {
        conn.once("data", function (dataAsString) {
            var payload = jsonParse(dataAsString);
            if (payload && payload.type === "login") {
                that.emit(payload.type, payload.data, conn);
            } else {
                that.sendToConnection(conn, "disconnected", null);
            }
        });
    });

    that.sendToConnection = function (conn, type, data) {
        // a user may not have a connection at startup so don't send them anything
        if (conn) {
            conn.write(JSON.stringify({type: type, data: data}, function (key, value) {
                return key === "conn" ? undefined : value;
            }));
        }
    };

    that.sendToUser = function (user, type, data) {
        that.sendToConnection(user.conn, type, data);
    };

    that.newConnectedUser = function(user, isValid) {
        if (user.sk) {
            that.emit("join", user);
        } else {
            that.emit("eavesdrop", user);
        }

        logger.info("connected", user.username);

        // this is some data coming from one of the clients
        user.conn.on("data", function(dataAsString) {
            if (isValid(user.username)) {
                var payload = jsonParse(dataAsString);
                if (payload) {
                    var type = payload.type;
                    var data = payload.data;
                    if (!that.emit(type, user, data)) {
                        logger.info("No event handler found for type", type);
                    }
                } else {
                    that.sendToConnection(user.conn, "disconnected", null);
                }
            } else {
                // this user has been removed, but is still sending messages
                // so tell them to log back in again
                that.sendToUser(user, "disconnected", null);
            }
        });

        user.conn.on("close", function() {
            logger.info("connection closed", user.username);
        });
    };

    that.getSockJs = function() {
        return sockjs;
    };
};

require("util").inherits(module.exports, require("events").EventEmitter);
