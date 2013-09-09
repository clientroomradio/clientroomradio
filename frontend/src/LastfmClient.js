module.exports = function(config) {
	var that = this;

	var LastFmNode = require('lastfm').LastFmNode;

	var lastfm = new LastFmNode({
	  api_key: config.api_key, 
	  secret: config.secret
	});

	that.login = function(token, callback) {
		lastfm.session({token: token}).on('success', function(session) {
			// Make it an "err, data"-style callback
			callback(null, session);
		});
	}

	that.setLoveStatus = function(user, track, loveFlag, callback) {
		var method = loveFlag ? "track.love" : "track.unlove";
		lastfm.request(method, {
			track: track.title,
			artist: track.creator,
			sk: user.sk,
			handlers: {
				success: function(lfm) {
					callback(null);
				},
				error: function(error) {
					callback(error.message);
				}
			}
		});
	}

	that.userGetInfo = function(user, callback) {
		lastfm.request('user.getInfo', {
			user: user,
			handlers: {
				success: function(lfm) {
					callback(null, lfm);
				},
				error: function(error) {
					callback(error.message, '');
				}
			}
		});
	}
}