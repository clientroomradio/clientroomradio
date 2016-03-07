"use strict";

var http = require("http");

module.exports = class SocketServer {
    constructor(socket, config, logger) {
        this.socket = socket;
        this.config = config;
        this.logger = logger;
    }

    start() {
        var httpServer = http.createServer();
        this.socket.getSockJs().installHandlers(httpServer, {prefix: "/sockjs"});
        httpServer.listen(this.config.port);
        this.logger.info(`Listening externally on port ${this.config.port}`);
    }
};
