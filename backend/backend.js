"use strict";

var _ = require("underscore");
var config = require("../config.js");
var request = require("request");
var winston = require("winston");

var Spotify = require("./src/spotify.js");
var Lastfm = require("./src/lastfm.js");
var Redis = require("../shared/src/redis.js");

winston.add(winston.transports.File, { filename: "backend.log" });
winston.remove(winston.transports.Console);
winston.add(winston.transports.Console, { timestamp: true });

var redis = new Redis(winston);
var spotify = new Spotify(winston);
var lastfm = new Lastfm(config, winston, redis);

var users = {};
var tracks = [];
var requests = [];
var skippers = [];
var currentStationUrl = "";

spotify.relogin();

var CURRENT_TRACK_KEY = "currentTrack";

var vlc = require("vlc")([
  "-I", "dummy",
  "-V", "dummy",
  "--verbose", "1",
  "--sout=#http{dst=:8080/stream.mp3}"
]);

function active(aUsers) {
	var activeUsers = {};

	for ( var user in aUsers ) {
		if ( aUsers[user].active ) {
			activeUsers[user] = aUsers[user];
		}
	}

	return activeUsers;
}

function onGotContext(track) {
	winston.info("onGotContext");

	var activeUserCount = _.keys(active(users)).length;
	var trackContextCount = _.keys(track.context).length;

	if (activeUserCount > 1 && activeUserCount === trackContextCount) {
		// it"s a bingo!
		track.bingo = true;
	}

	redis.set(CURRENT_TRACK_KEY, track, function (err, reply) {
		if (err) {
			winston.error("onGotAllContext", err, reply);
		}
	});
}

function playTrack() {
	redis.set("skippers", [], function (err, reply) {
		winston.info("Skippers cleared", err, reply);

		var handlers = {
			success: function(track, port) {
				var media = vlc.mediaFromUrl("http://localhost:" + port);
				media.parseSync();
				vlc.mediaplayer.media = media;
				vlc.mediaplayer.play();

				// add a timestamp to the track as we start it
				track.timestamp = new Date().getTime();

				lastfm.updateNowPlaying(track, users);
				lastfm.getContext(track, active(users), onGotContext);
			},
			error: function(error) {
				winston.error("playTrack", error.message);
				onEndTrack();
			}
		};

		var nextTrack = tracks.shift();

		if (_.has(nextTrack, "request")) {
			spotify.request(nextTrack, handlers);
		} else {
			spotify.search(nextTrack, handlers);
		}
	});
}

function onEndTrack() {
	winston.info("onEndTrack");

	redis.get(CURRENT_TRACK_KEY, function (getErr, currentTrack) {
		if (getErr) {
			winston.error("there was a problem getting the current track", getErr);
		} else {
			lastfm.scrobble(currentTrack, users, skippers);

			// clear the current track before doing anything else
			redis.set(CURRENT_TRACK_KEY, {}, function (setErr, reply) {
				if (setErr) {
					winston.error("there was an error setting the track", setErr);
				}

				if (requests.length > 0) {
					// there's a request, so cue it and play now
					tracks.unshift(requests.shift());
					playTrack();
				} else {
					// there are no requests so continue playing the radio
					if (currentStationUrl !== lastfm.getStationUrl(active(users))) {
						// The station is different so clear tracks and retune
						tracks = [];
						currentStationUrl = lastfm.radioTune(active(users), onRadioTuned);
					} else {
						// the station is the same
						if (tracks.length > 0) {
							// there are more tracks to play so continue playing them
							playTrack();
						} else {
							// fetch a new playlist
							lastfm.getPlaylist(onRadioGotPlaylist);
						}
					}
				}
			});
		}
	});
}

vlc.mediaplayer.on("EndReached", function () {
	// we can"t start another track from within a
	// vlc callback (not reentrant) so we _.defer it
	_.defer(onEndTrack);
});

function onRadioGotPlaylist(xspf) {
	winston.info("onRadioGotPlaylist", xspf.playlist.trackList.track.length);

	tracks = xspf.playlist.trackList.track;

	playTrack();
}

function onRadioTuned(data) {
	winston.info("onRadioTuned", data.url);
	lastfm.getPlaylist(onRadioGotPlaylist);
}

function onUsersChanged(err, newUsers) {
	if (err) {
		winston.error("onUsersChanged", err);
	}

	winston.info("onUsersChanged", _.keys(newUsers));

	if ( !_.isEmpty(active(newUsers)) && _.isEmpty(active(users))
			&& !vlc.mediaplayer.is_playing ) {
		// we"ve gone from no users to some users
		// and we"re not already playing so start
		winston.info("START!");
		currentStationUrl = lastfm.radioTune(active(newUsers), onRadioTuned);
	}

	users = newUsers;
}

function onSkippersChanged(err, newSkippers) {
	if (err) {
		winston.error("onSkippersChanged", err);
	}


	winston.info("onSkippersChanged:", newSkippers);
	skippers = newSkippers;

	if ( _.keys(active(users)).length > 0
			&& newSkippers.length > 0
			&& newSkippers.length >= Math.ceil(_.keys(active(users)).length / 2) ) {
		winston.info("SKIP!");
		onEndTrack();
	}
}

function onTagsChanged(err, newTags) {
	if (err) {
		winston.error("onTagsChanged", err);
	}

	winston.info("onTagsChanged: ", newTags);

	// clear the track list so that the tag change is in effect from the next track
	lastfm.setTags(newTags);
}

function onDiscoveryHourChanged(err, discoveryHour) {
	if (err) {
		winston.error("onDiscoveryHourChanged", err);
	}

	winston.info("Start discovery hour!");
	lastfm.setDiscoveryHourStart(discoveryHour.start);
}

function doSend(path, payload) {
	request.post("http://localhost:3001" + path, {json: payload}, function (error, response, body) {
		if (error) {
			winston.error("doSend", error);
		} else if (response.statusCode !== 200) {
			winston.error("doSend: STATUS CODE != 200", response.body);
		}
	});
}

function updateProgress() {
	redis.get(CURRENT_TRACK_KEY, function (err, currentTrack) {
		if (err) {
			winston.error("updateProgress", "couldn't get track", err);
		}

		var actualPosition = (vlc.mediaplayer.position * vlc.mediaplayer.length) / currentTrack.duration;
		doSend("/progress", {progress: actualPosition});
	});
}

redis.on("ready", function () {
    winston.info("Redis ready");

    // Get initial values
    redis.get("tags", onTagsChanged);
    redis.get("discoveryHour", onDiscoveryHourChanged);
    redis.get("skippers", onSkippersChanged);
    redis.get("users", onUsersChanged);

    // listen for changes
    redis.on("users", onUsersChanged);
    redis.on("skippers", onSkippersChanged);
    redis.on("tags", onTagsChanged);
    redis.on("discoveryHour", onDiscoveryHourChanged);
});

setInterval(updateProgress, 2000);

var express = require("express");
var bodyParser = require("body-parser");
var app = express();

app.use(bodyParser.json());

app.post("/request", function (req, res){
	winston.info("Got a Spotify request!", req.body);
	requests.push(req.body);
    res.end();
});

app.use(function (req, res){
	res.send(404);
});

app.listen(3002);
winston.info("Listening internally on port %s", 3002);

process.on("SIGINT", function () {
	winston.info( "\nShutting down!" );

	redis.set(CURRENT_TRACK_KEY, {}, function (ctErr, ctReply) {
		winston.info("currentTrack cleared", ctErr, ctReply);
		redis.set("skippers", [], function (sErr, sReply) {
			winston.info("skippers cleared.", sErr, sReply);
			spotify.logout();
			spotify.once("logout", function (lErr) {
				winston.info("Spotify logged out!\n***EXIT***", lErr);
				throw (0);
			});
		});
	});
});


