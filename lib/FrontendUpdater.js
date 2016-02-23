/**
 * This keeps the frontend updated when data changes
 */
module.exports = function(socket, userDao, currentTrackManager, skipManager, chat) {

    userDao.on("change", function (users) {
        userDao.broadcast("users", userDao.getFilteredUsers());
    });

    skipManager.on("change", function (skippers) {
        userDao.broadcast("skippers", skippers);
    });

    skipManager.on("skip", function (skipper, skippers) {
        userDao.broadcast("skip", {skipper: skipper, skippers: skippers});
    });

    currentTrackManager.on("change", function (currentTrack) {
        userDao.broadcast("newTrack", currentTrack);
    });

    function updateUser(user) {
        userDao.sendToUsername(user.username, "config", userDao.getUserConfig(user));
        userDao.sendToUsername(user.username, "users", userDao.getFilteredUsers());
        userDao.sendToUsername(user.username, "skippers", skipManager.getSkippers());
        userDao.sendToUsername(user.username, "newTrack", currentTrackManager.getCurrentTrack());

        var bingo = currentTrackManager.getCurrentTrack().bingo;
        userDao.sendToUsername(user.username, "bingo", typeof bingo !== "undefined" && bingo);

        // send the chat messages
        if (user && user.allowed) {
            chat.clear(user);
            chat.getBacklog().forEach(function (message) {
                userDao.sendToUsername(user.username, "chat", message);
            });
        }
    }

    socket.on("join", function (user) {
        updateUser(user);
    });

    socket.on("eavesdrop", function (user) {
        updateUser(user);
    });
};
