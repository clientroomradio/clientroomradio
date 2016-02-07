module.exports = function(userDao, chat, socket) {

    userDao.on("change", function (newUsers, oldUsers) {
        // has a user been removed?
        Object.keys(oldUsers).forEach(function (username) {
            if (!newUsers.hasOwnProperty(username)) {
                chat.userLeft(oldUsers[username]);
            }
        });
    });

    // This compare users chnging their activity status
    socket.on("activeStatus", function (user, data) {
        var newValue = data.status ? true : false;
        var message = data.message;

        if (user.active !== newValue) {
            user.active = newValue;
            if (newValue) {
                chat.userBecomesActive(user, message);
            } else {
                chat.userBecomesInactive(user, message);
            }

            userDao.setUser(user);
        }
    });
};
