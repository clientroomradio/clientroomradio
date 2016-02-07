/**
 * This keeps the frontend updated when data changes
 */
module.exports = function(socket, userDao, currentTrackManager, skipManager, dataStore) {

    userDao.on("change", function (users) {
        socket.broadcast("users", userDao.getFilteredUsers(users));
    });

    skipManager.on("change", function (skippers) {
        socket.broadcast("skippers", skippers);
    });

    skipManager.on("skip", function (skipper, skippers) {
        socket.broadcast("skip", {skipper: skipper, skippers: skippers});
    });

    currentTrackManager.on("change", function (currentTrack) {
        socket.broadcast("newTrack", currentTrack);
    });

    function updateUser(user, send) {
        send("users", userDao.getFilteredUsers());
        send("skippers", skipManager.getSkippers());
        send("newTrack", currentTrackManager.getCurrentTrack());

        var bingo = currentTrackManager.getCurrentTrack().bingo;
        socket.broadcast("bingo", typeof bingo !== "undefined" && bingo);
    }

    socket.on("join", function (user, send) {
        updateUser(user, send);
    });

    socket.on("eavesdrop", function (user, send) {
        updateUser(user, send);
    });
};
