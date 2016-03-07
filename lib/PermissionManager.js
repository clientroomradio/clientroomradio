"use strict";

var events = require("events");
var uuid = require("node-uuid");

module.exports = class PermissionManager extends events.EventEmitter {
    constructor(dataStore, userDao, votingManager, chat, socket, lastfmClient, config, logger) {
        super();

        this.dataStore = dataStore;
        this.userDao = userDao;
        this.votingManager = votingManager;
        this.chat = chat;
        this.socket = socket;
        this.lastfmClient = lastfmClient;
        this.config = config;
        this.logger = logger;

        this.allowedUsers = dataStore.read("allowedUsers") || [];
        dataStore.record(this, "change", "allowedUsers");

        socket.on("token", (token, conn) => {
            lastfmClient.login(token, (err, session) => {
                if (err) {
                    logger.error("login", err);
                } else {
                    var sessionId = uuid.v4();
                    var allowed = this.isAllowedToJoin(session.user);
                    var user = userDao.addUser(session.user, sessionId, session.key, allowed);
                    user.private.conn = conn;

                    if (allowed) {
                        chat.userJoined(user);
                    } else {
                        // start a vote to see if people want them in
                        this.requestAccess(session.user, sessionId);
                    }

                    socket.newLoggedInUser(user);
                }
            });
        });
    }

    isAllowedToJoin(user) {
        if (this.config.whitelist) {
            return this.allowedUsers.filter(allowedUser => {
                return allowedUser.toLowerCase() === user.toLowerCase();
            }).length > 0;
        }

        return true;
    };

    requestAccess(username, id) {
        this.votingManager.propose("newUser", null, {"username": username, "id": id}, successful => {

            if (successful) {
                this.logger.info("adding new user", username);
                this.allowedUsers.push(username);

                this.userDao.setAllowedByUsername(username);

                this.emit("change", this.allowedUsers);
                this.chat.newUser(this.userDao.getUsers()[username]);
            } else {
                // the user was unsuccessful so remove them completely
                this.userDao.setAnonymousByUsername(username);
            }
        });
    };
};
