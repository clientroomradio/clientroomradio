/**
 * This module doesn't really need rebus, it just makes it easier to debug.
 * Feel free to ditch it
 */
module.exports = function(chat, socket, redis) {
	var that = this;

	var defaultPeriod = 30000;

	var uuid = require('node-uuid');
	var _ = require('underscore');

	var callbacks = {};
	var votings = {};

	redis.get('votings', function (err, initialVotings) {
		votings = initialVotings;
	});

	// callback(successful, messageFunction)
	that.propose = function(type, user, data, callback) {
		var id = uuid.v4();
		chat.startVoting(user, type, data, id);
		votes = {};
		votes[user.username] = 'yes';
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

		redis.on('votings', function (err, newVotings) {
			votings = newVotings;
			socket.broadcast('updateVotes', votings[id]);
		});
	};

	socket.on('requestVotes', function(user, data, reply) {
		var voting = getVoting(data.id);
		if (voting) {
			reply('updateVotes', voting);
		}
	});

	socket.on('castVote', function(user, data) {
		var voting = getVoting(data.id);
		if (voting && voting.decision == null) {
			voting.votes[user.username] = (data.vote == 'yes')?'yes':'no';
			setVoting(voting);
		}
	});

	that.voteFor = function(id) {

	};

	that.cancel = function(id) {

	}

	function setVoting(voting) {
		votings[voting.id] = voting;
		setVotings(votings);
	}

	function getVoting(id) {
		return votings[id] || null;
	}

	function getVotings() {
		return votings;
	}

	function setVotings(votings) {
		redis.set('votings', votings);
	}

	setInterval(function() {
		_.each(votings, function(voting) {
			if (voting.remainingTime > 0) {
				voting.remainingTime -= 1000;
				if (voting.remainingTime <= 0) {
					// A voting is over
					voting.remainingTime = 0;
					var sumOfVotes = _.countBy(_.values(voting.votes), function(value) { return value; });
					var yesVotes = sumOfVotes['yes'] || 0;
					var noVotes = sumOfVotes['no'] || 0;
					voting.decision = (yesVotes > noVotes) ? 'yes' : 'no';
					callbacks[voting.id](voting.decision == 'yes');
					delete callbacks[voting.id];
				}
				setVoting(voting);
			}
		})
	}, 1000);
	
}