/**
 * This module doesn"t really need rebus, it just makes it easier to debug.
 * Feel free to ditch it
 */
module.exports = function(chat, socket, userDao) {
    var that = this;

    var defaultPeriod = 30000;

    var uuid = require("node-uuid");

    var callbacks = {};
    var votings = {};

    function setVoting(voting) {
        votings[voting.id] = voting;
        userDao.broadcast("updateVotes", voting);
    }

    function getVoting(id) {
        return votings[id] || null;
    }

    that.propose = function(type, user, data, callback) {
        // if we passed in an id with data.id, use that, otherwise generate one
        var id = data.hasOwnProperty("id") ? data.id : uuid.v4();
        chat.startVoting(user, type, data, id);
        var votes = {};
        if (user) {
            votes[user.username] = "yes";
        }
        var votingPeriod = defaultPeriod;
        setVoting({
            id: id,
            type: type,
            user: user ? user.username : data.username,
            data: data,
            votes: votes,
            remainingTime: votingPeriod,
            decision: null
        });

        callbacks[id] = callback;
    };

    socket.on("requestVotes", function (user, data) {
        var voting = getVoting(data.id);
        if (voting) {
            userDao.broadcast("updateVotes", voting);
        }
    });

    socket.on("castVote", function(user, data) {
        var voting = getVoting(data.id);
        if (voting && voting.decision == null) {
            voting.votes[user.username] = (data.vote === "yes") ? "yes" : "no";
            setVoting(voting);
        }
    });

    setInterval(function() {
        Object.keys(votings).forEach(function (votingID) {
            var voting = votings[votingID];
            if (voting.remainingTime > 0) {
                voting.remainingTime -= 1000;
                if (voting.remainingTime <= 0) {
                    // A voting is over
                    voting.remainingTime = 0;

                    var yesVotes = Object.keys(voting.votes).filter(function (username) {
                        return voting.votes[username] === "yes";
                    }).length;

                    var noVotes = Object.keys(voting.votes).filter(function (username) {
                        return voting.votes[username] === "no";
                    }).length;

                    voting.decision = (yesVotes > noVotes) ? "yes" : "no";
                    callbacks[voting.id](voting.decision === "yes");
                    delete callbacks[voting.id];
                }
            }
            userDao.broadcast("updateVotes", voting);
        });
    }, 1000);
};
