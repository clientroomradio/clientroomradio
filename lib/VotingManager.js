/**
 * This module doesn"t really need rebus, it just makes it easier to debug.
 * Feel free to ditch it
 */
module.exports = function(chat, socket, dataStore) {
    var that = this;

    var defaultPeriod = 30000;

    var uuid = require("node-uuid");

    var callbacks = {};

    function getVotings() {
        return dataStore.get("votings");
    }

    function setVotings(newVotings) {
        dataStore.set("votings", newVotings);
    }

    function setVoting(voting) {
        var votings = getVotings();
        votings[voting.id] = voting;
        setVotings(votings);
    }

    function getVoting(id) {
        return getVotings()[id] || null;
    }

    // callback(successful, messageFunction)
    that.propose = function(type, user, data, callback) {
        var id = uuid.v4();
        chat.startVoting(user, type, data, id);
        var votes = {};
        votes[user.username] = "yes";
        var votingPeriod = defaultPeriod;
        setVoting({
            id: id,
            type: type,
            user: user.username,
            data: data,
            votes: votes,
            remainingTime: votingPeriod,
            decision: null
        });

        callbacks[id] = callback;

        dataStore.on("votings", function (newVotings) {
            socket.broadcast("updateVotes", newVotings[id]);
        });
    };

    socket.on("requestVotes", function(user, data, reply) {
        var voting = getVoting(data.id);
        if (voting) {
            reply("updateVotes", voting);
        }
    });

    socket.on("castVote", function(user, data) {
        var voting = getVoting(data.id);
        if (voting && voting.decision == null) {
            voting.votes[user.username] = (data.vote === "yes") ? "yes" : "no";
            setVoting(voting);
        }
    });

    that.voteFor = function(id) {

    };

    that.cancel = function(id) {

    };

    setInterval(function() {
        var votings = getVotings();
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
                setVoting(voting);
            }
        });
    }, 1000);
};
