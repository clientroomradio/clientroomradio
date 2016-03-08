"use strict";

var events = require("events");

module.exports = class Socket extends events.EventEmitter {
    constructor(logger) {
        super();

        this.logger = logger;

        this.setMaxListeners(0);

        this.sockjs = require("sockjs").createServer();
        this.sockjs.on("connection", conn => {
            conn.once("data", dataAsString => {
                var payload = this.jsonParse(dataAsString);
                if (payload && payload.type === "token") {
                    // this the the user logging in
                    logger.info("received token", payload);
                    this.emit(payload.type, payload.data, conn);
                } else if (payload && payload.type === "login") {
                    this.emit(payload.type, payload.data, conn);
                } else {
                    this.sendToConnection(conn, "disconnected", null);
                }
            });
        });
    }

    jsonParse(dataAsString) {
        try {
            return JSON.parse(dataAsString);
        } catch (err) {
            this.logger.error("client sent bad JSON", dataAsString, err);
        }

        return null;
    }

    newLoggedInUser(user) {
        this.sendToConnection(user.conn, "session", user.session);
    };

    sendToConnection(conn, type, data) {
        // a user may not have a connection at startup so don't send them anything
        if (conn) {
            conn.write(JSON.stringify({type: type, data: data}, (key, value) => {
                // never send a connection or session key to the frontend
                return ["sk", "conn"].indexOf(key) !== -1 ? undefined : value;
            }));
        }
    };

    sendToUser(user, type, data) {
        this.sendToConnection(user.conn, type, data);
    };


    newConnectedUser(user, isValid) {
        // send the user the config over the socket
        if (user.sk) {
            this.emit("join", user);
        } else {
            this.emit("eavesdrop", user);
        }

        this.logger.info("connected", user.username);

        // this is some data coming from one of the clients
        user.conn.on("data", dataAsString => {
            if (isValid(user.username)) {
                var payload = this.jsonParse(dataAsString);
                if (payload) {
                    var type = payload.type;
                    var data = payload.data;
                    if (!this.emit(type, user, data)) {
                        this.logger.info("No event handler found for type", type);
                    }
                } else {
                    this.sendToConnection(user.conn, "disconnected", null);
                }
            } else {
                // this user has been removed, but is still sending messages
                // so tell them to log back in again
                this.sendToUser(user, "disconnected", null);
            }
        });

        user.conn.on("close", () => {
            this.logger.info("connection closed", user.username);
        });
    };

    getSockJs() {
        return this.sockjs;
    };
};
