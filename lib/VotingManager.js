"use strict";

var uuid = require("node-uuid");

module.exports = class VotingManager {
    constructor(chat, socket, userDao) {
        this.chat = chat;
        this.socket = socket;
        this.userDao = userDao;

        this.defaultPeriod = 30000;
        this.callbacks = {};
        this.votings = {};

        socket.on("requestVotes", (user, data) => {
            var voting = this.getVoting(data.id);
            if (voting) {
                userDao.broadcast("updateVotes", voting);
            }
        });

        socket.on("castVote", (user, data) => {
            var voting = this.getVoting(data.id);
            if (voting && voting.decision == null) {
                voting.votes[user.username] = (data.vote === "yes") ? "yes" : "no";
                this.setVoting(voting);
            }
        });

        setInterval(() => this.updateVotes(), 1000);
    }

    setVoting(voting) {
        this.votings[voting.id] = voting;
        this.userDao.broadcast("updateVotes", voting);
    }

    getVoting(id) {
        return this.votings[id] || null;
    }

    propose(type, user, data, callback) {
        // if we passed in an id with data.id, use that, otherwise generate one
        var id = data.hasOwnProperty("id") ? data.id : uuid.v4();
        this.chat.startVoting(user, type, data, id);
        var votes = {};
        if (user) {
            votes[user.username] = "yes";
        }
        var votingPeriod = this.defaultPeriod;
        this.setVoting({
            id: id,
            type: type,
            user: user ? user.username : data.username,
            data: data,
            votes: votes,
            remainingTime: votingPeriod,
            decision: null
        });

        this.callbacks[id] = callback;

        this.userDao.broadcast("newVote", this.votings[id]);
    };

    updateVotes() {
        Object.keys(this.votings).forEach(votingID => {
            var voting = this.votings[votingID];
            if (voting.remainingTime > 0) {
                voting.remainingTime -= 1000;
                if (voting.remainingTime <= 0) {
                    // A voting is over
                    voting.remainingTime = 0;

                    var yesVotes = Object.keys(voting.votes).filter(username => {
                        return voting.votes[username] === "yes";
                    }).length;

                    var noVotes = Object.keys(voting.votes).filter(username => {
                        return voting.votes[username] === "no";
                    }).length;

                    voting.decision = (yesVotes > noVotes) ? "yes" : "no";
                    this.callbacks[voting.id](voting.decision === "yes");
                    delete this.callbacks[voting.id];
                }
            }
            this.userDao.broadcast("updateVotes", voting);
        });
    }
};
