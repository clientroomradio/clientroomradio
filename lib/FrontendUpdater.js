/**
 * This keeps the frontend updated when data changes
 */
module.exports = function(socket, userDao, currentTrackDao, skipManager, dataStore) {

    userDao.on("change", function (users) {
        socket.broadcast("users", userDao.getFilteredUsers(users));
    });

    skipManager.on("change", function (skippers) {
        socket.broadcast("skippers", skippers);
    });

    skipManager.on("skip", function (skipper, skippers) {
        socket.broadcast("skip", {skipper: skipper, skippers: skippers});
    });

    currentTrackDao.on("change", function (currentTrack) {
        socket.broadcast("newTrack", currentTrack);
    });

    socket.on("join", function (user, send) {
        send("users", userDao.getFilteredUsers());
        send("skippers", skipManager.getSkippers());
        send("newTrack", currentTrackDao.getCurrentTrack());

        var discoveryHour = dataStore.get("discoveryHour");
        var discoveryHourOn = (new Date().getTime() - discoveryHour.start < 3600000);
        send("discoveryHour", discoveryHourOn);

        var bingo = currentTrackDao.getCurrentTrack().bingo;
        socket.broadcast("bingo", typeof bingo !== "undefined" && bingo);
    });
};
