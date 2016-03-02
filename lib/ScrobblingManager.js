"use strict";

module.exports = class ScrobblingManager {
    constructor(socket, userDao) {
        socket.on("scrobbleStatus", (user, newValue) => {
            userDao.setUserScrobbling(user.username, newValue);
        });
    }
};
