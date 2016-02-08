module.exports = function(userDao, chat, socket) {

    userDao.on("removing", function (user) {
        // a user is about to be removed
        chat.userLeft(user);
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
