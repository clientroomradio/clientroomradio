module.exports = function() {
	var that = this;

	var config = require("../../config.js");
	var _ = require("underscore");
	var LastFmNode = require('lastfm').LastFmNode;
	var util = require('util');

	var mDiscoveryHourStart = new Date(0);
	var tags = []; 

	var lastfm = new LastFmNode({
		api_key: config.api_key,
		secret: config.secret,
		useragent: 'clientroomradio/v0.1 Client Room Radio'
	});

	function doUpdateNowPlaying(username, session_key, track) {
		var request = lastfm.request("track.updateNowPlaying", {
			album: track.album,
			track: track.title,
			artist: track.creator,
			duration: (track.duration / 1000),
			sk: session_key,
			handlers: {
				success: function(lfm) {
					console.log("Updated now playing for:", username);
				},
				error: function(error) {
					console.log("Now playing error:" + error.message);
				}
			}
		});
	}

	that.updateNowPlaying = function(track, users) {
		if ( !_.isEmpty(track) ) {
			// always scrobble to clientroom
			doUpdateNowPlaying("clientroom", config.sk, track);

			_.each(users, function(data, user) {
				if ( !(!data.scrobbling || !data.active) ) {
					doUpdateNowPlaying(user, data.sk, track);
				}
			});
		}
	}

	function doScrobble(username, session_key, track) {
		var options = {
			"album[0]": track.album,
			"track[0]": track.title,
			"artist[0]": track.creator,
			"timestamp[0]": Math.round(track.timestamp / 1000),
			"duration[0]": Math.round(track.duration / 1000),
			sk: session_key,
			"chosenByUser[0]": "0",
			handlers: {
				success: function(lfm) {
					console.log("Scrobbled track for:", username);
				},
				error: function(error) {
					console.log("Scrobble error:" + error.message);
				}
			}
		}

		if ( _.has( track.extension, 'streamid') )
			options["streamid[0]"] = track.extension.streamid;

		var request = lastfm.request("track.scrobble", options );
	}

	that.setTags = function(newTags) {
		tags = newTags;
	}

	that.scrobble = function(track, users, skippers) {
		if ( !_.isEmpty(track) && new Date().getTime() - track.timestamp > Math.round( track.duration / 2 ) ) {
			// we've listened to more than half the song
			doScrobble("clientroom", config.sk, track);

			_.each(users, function(data, user) {
				if (  !(!data.scrobbling || !data.active) 
						&& !_.contains(skippers, user) ) {
					// the user hasn't voted to skip this track
					doScrobble(user, data.sk, track);
				}
			});
		}
	}

	that.trackGetAlbumArt = function(track) {
	    var getInfoRequest = lastfm.request("track.getInfo", {
	        track: track.title,
	        artist: track.creator,
	        handlers: {
	            success: function(lfm) {
	            	if (typeof lfm.track.album != 'undefined') {
						track.image = lfm.track.album.image[1]["#text"];
					}
	            }
	        }
	    });
	}

	that.getContext = function(track, users, callback) {
		_.each(users, function(data, user) {
			var request = lastfm.request("track.getInfo", {
				track: track.title,
				artist: track.creator,
				username: user,
				handlers: {
					success: function(lfm) {
						console.log(track.title, user, lfm.track.userplaycount)
						track.context = track.context || [];
						if ( lfm.track.userplaycount ) {
							track.context.push({"username":user,"userplaycount":lfm.track.userplaycount,"userloved":lfm.track.userloved});

							callback(track);
						}
					},
					error: function(error) {
						console.log("Error: " + error.message);
					}
				}
			});
		});
	}

	that.startDiscoveryHour = function() {
		mDiscoveryHourStart = new Date().getTime();
	}

	that.getStationUrl = function(users) {
		var rqlString = '';

		var sortedUsers = _.keys(users).sort();

		for ( var user in sortedUsers ) {
			if (rqlString.length == 0) {
				rqlString = util.format('%s', 'user:' + sortedUsers[user]);
			} else {
				rqlString = util.format('%s or %s', rqlString, 'user:' + sortedUsers[user]);
			}
		}

		// and some tags?
		if (tags.length > 0) {
			// We have some tags so use them!
			tagString = "";

			for (var tag in tags) {
				if (tagString.length == 0) {
					tagString = util.format('tag:"%s"', tags[tag]);
				} else {
					tagString = util.format('%s or tag:"%s"', tagString, tags[tag]);
				}
			}

			rqlString = util.format('(%s) and (%s)', rqlString, tagString);
		}

		if (new Date().getTime() - mDiscoveryHourStart < 3600000) {
			// it's discovery hour!
			rqlString = util.format('%s %s', rqlString, 'opt:discovery|true');
		}

		console.log(rqlString);

		return 'lastfm://rql/' + Buffer(rqlString).toString('base64');
	}

	that.radioTune = function(users, callback) {
		var stationUrl = that.getStationUrl(users);

		if ( !_.isEmpty(users) ) {
			var request = lastfm.request("radio.tune", {
				station: stationUrl,
				sk: config.sk,
				handlers: {
					success: callback,
					error: function(error) {
						console.log("Error: " + error.message);
					}
				}
			});
		}

		return stationUrl;
	}

	that.getPlaylist = function(callback) {
		var request = lastfm.request("radio.getplaylist", {
			sk: config.sk,
			handlers: {
				success: callback,
				error: function(error) {
					console.log("Error: " + error.message);
				}
			}
		});
	}
}

require('util').inherits(module.exports, require("events").EventEmitter);