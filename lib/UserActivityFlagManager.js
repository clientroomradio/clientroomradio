"use strict";

module.exports = class UserActivityFlagManager {
    constructor(userDao, chat, socket) {
        userDao.on("left", user => {
            // a user is about to be removed
            if (user.sk) {
                chat.userLeft(user);
            }
        });

        userDao.on("timedOut", user => {
            // a user is about to be removed
            if (user.sk) {
                chat.userTimedOut(user);
            }
        });

        // This compare users chnging their activity status
        socket.on("activeStatus", (user, data) => {
            var newValue = data.status ? true : false;
            var message = data.message;

            if (user.active !== newValue) {
                if (newValue) {
                    chat.userBecomesActive(user, message);
                } else {
                    chat.userBecomesInactive(user, message);
                }

                userDao.setUserActive(user.username, newValue);
            }
        });


        // This user's changing their muted status
        socket.on("mutedStatus", (user, data) => {
            var newValue = data.status ? true : false;
            userDao.setUserMuted(user.username, newValue);
        });
    }
};
