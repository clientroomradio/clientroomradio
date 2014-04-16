module.exports = function(config, winston, redis) {
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
					winston.info("Updated now playing for:", username);
				},
				error: function(error) {
					winston.error("doUpdateNowPlaying", error.message);
				}
			}
		});
	}

	that.updateNowPlaying = function(track, users) {
		addPlayedTrack(track);

		if ( !_.isEmpty(track) ) {
			// always scrobble to clientroom
			if (typeof config.scrobbleToHost == 'undefined' || config.scrobbleToHost) {
				doUpdateNowPlaying("clientroom", config.sk, track);
			}

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
					winston.info("Scrobbled track for:", username);
				},
				error: function(error) {
					winston.info("Scrobble error:" + error.message);
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
			if (typeof config.scrobbleToHost == 'undefined' || config.scrobbleToHost) {
				doScrobble("clientroom", config.sk, track);
			}

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
		track.context = {};

		var finished = _.after(_.keys(users).length * 2, callback);

		_.each(users, function(data, user) {
			lastfm.request("track.getInfo", {
				track: track.title,
				artist: track.creator,
				username: user,
				handlers: {
					success: function(lfm) {
						winston.info("getContext", user, track.title, lfm.track.userplaycount);
						if (typeof lfm.track.album != 'undefined') {
							track.image = lfm.track.album.image[2]['#text'];
						}
						if (typeof lfm.track.userplaycount != 'undefined') {
							track.context[user] = track.context[user] || {"username": user};
							track.context[user].userplaycount = lfm.track.userplaycount;
							track.context[user].userloved = lfm.track.userloved;
						}
						finished(track);
					},
					error: function(error) {
						winston.error("getContext:track.getInfo", error.message);
						finished(track);
					}
				}
			});

			lastfm.request("artist.getInfo", {
				artist: track.creator,
				username: user,
				handlers: {
					success: function(lfm) {
						if (typeof lfm.artist != 'undefined'
								&& typeof lfm.artist.stats != 'undefined'
								&& lfm.artist.stats.hasOwnProperty('userplaycount')
								&& lfm.artist.stats.userplaycount == 0) {
							track.context[user] = track.context[user] || {"username": user};
							track.context[user].artistInLibrary = true;
						}
						finished(track);
					},
					error: function(error) {
						winston.error("getContext:artist.getInfo", error.message);
						finished(track);
					}
				}
			});
		});
	}

	that.setDiscoveryHourStart = function(discoveryHourStart) {
		mDiscoveryHourStart = discoveryHourStart;
	}

	function getRqlStationUrl(sortedUsers) {
		var rqlString = '';

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

		return 'lastfm://rql/' + Buffer(rqlString).toString('base64');
	}

	function getStandardStationUrl(sortedUsers) {
		var stationUsers = '';

		for (var user in sortedUsers) {
			if ( stationUsers.length > 0 )
				stationUsers += ',' + sortedUsers[user];
			else
				stationUsers += sortedUsers[user];
		}

		return 'lastfm://users/' + stationUsers + '/personal';
	}

	that.getStationUrl = function(users) {
		var sortedUsers = _.keys(users).sort();
		var stationUrl = getStandardStationUrl(sortedUsers);
		winston.info("getStationUrl", stationUrl);
		return stationUrl;
	}

	that.radioTune = function(users, callback) {
		var stationUrl = that.getStationUrl(users);

		if ( !_.isEmpty(users) ) {
			var request = lastfm.request("prototype.tune", {
				station: stationUrl,
				sk: config.sk,
				signed: true,
				write: true,
				handlers: {
					success: callback,
					error: function(error) {
						winston.error("radioTune", error.message);
						winston.info("Try again in one second...");
						setTimeout(that.radioTune, 1000, users, callback);
					}
				}
			});
		}

		return stationUrl;
	}

	function addPlayedTrack(track) {
		redis.get("playedTracks", function (err, playedTracks) {
			playedTracks[getTrackId(track)] = {"timestamp": new Date().getTime()};

			winston.info("addPlayedTrack", _.keys(playedTracks));

			// TODO: get rid of any tracks more than one day old
			redis.set("playedTracks", playedTracks, function (err) {
			});
		});
	}

	function getTrackId(track) {
		return track.creator + track.title;
	}

	that.getPlaylist = function(callback) {
		var request = lastfm.request("prototype.getplaylist", {
			sk: config.sk,
			signed: true,
			handlers: {
				success: function(xspf) {
					redis.get("playedTracks", function (err, playedTracks) {
						for (var i = xspf.playlist.trackList.track.length - 1 ; i >= 0 ; i--) {
							if (_.contains(_.keys(playedTracks), getTrackId(xspf.playlist.trackList.track[i]))) {
								var removedTrack = xspf.playlist.trackList.track.splice(i, 1);
								winston.info("removedTrack", removedTrack.title);
							}
						}

						callback(xspf);
					});
				},
				error: function(error) {
					winston.error("getPlaylist", error.message);
					winston.info("Try again in one second...");
					setTimeout(that.getPlaylist, 1000, callback);
				}
			}
		});
	}
}

require('util').inherits(module.exports, require("events").EventEmitter);