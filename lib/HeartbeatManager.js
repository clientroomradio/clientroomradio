module.exports = function (socket, chat, userDao) {
    var that = this;

    var lastHeartbeat = {};

    // check the clients have sent hearbeats and remove any that are too old
    that.start = function() {
        setInterval(function() {
            var current = new Date().getTime();
            Object.keys(lastHeartbeat).forEach(function (username) {
                var user = lastHeartbeat[username].user;
                var timestamp = lastHeartbeat[username].timestamp;
                if (current - 10000 > timestamp) {
                    userDao.removeUser(user);
                    chat.userTimedOut(user);
                }
            });
        }, 10000);
    };

    // stop doing a heartbeat for users that have left
    userDao.on("change", function (newUsers) {
        Object.keys(lastHeartbeat).forEach(function (username) {
            if (!newUsers.hasOwnProperty(username)) {
                delete lastHeartbeat[username];
            }
        });
    });

    // receive heartbeats from the clients
    socket.on("heartbeat", function(user) {
        lastHeartbeat[user.username] = {
            "timestamp": new Date().getTime(),
            "user": user
        };
    });
};
