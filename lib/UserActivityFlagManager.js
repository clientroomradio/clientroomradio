module.exports = function(userDao, chat, socket) {

    userDao.on("left", function (user) {
        // a user is about to be removed
        if (user.sk) {
            chat.userLeft(user);
        }
    });

    userDao.on("timedOut", function (user) {
        // a user is about to be removed
        if (user.sk) {
            chat.userTimedOut(user);
        }
    });

    // This compare users chnging their activity status
    socket.on("activeStatus", function (user, data) {
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
};
