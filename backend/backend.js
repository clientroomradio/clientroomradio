var _ = require("underscore");
var config = require("../config.js");
var fs = require('fs');
var request = require('request');
var util = require('util');
var winston = require('winston');

var Spotify = require('./src/spotify.js');
var Lastfm = require('./src/lastfm.js');
var Redis = require('../shared/src/redis.js');

winston.add(winston.transports.File, { filename: 'backend.log' });
winston.remove(winston.transports.Console);
winston.add(winston.transports.Console, { timestamp: true });

var spotify = new Spotify(winston);
var lastfm = new Lastfm(config, winston);
var redis = new Redis(winston);

var users = {};
var tracks = [];
var requests = [];
var skippers = [];
var currentStationUrl = '';

spotify.relogin();

redis.on("ready", function () {
    winston.info("Redis ready");

    // Get initial values
    redis.get('tags', onTagsChanged);
    redis.get('discoveryHour', onDiscoveryHourChanged);
    redis.get('skippers', onSkippersChanged);
    redis.get('users', onUsersChanged);	

    // listen for changes
    redis.on('users', onUsersChanged);
    redis.on('skippers', onSkippersChanged);
    redis.on('tags', onTagsChanged);
    redis.on('discoveryHour', onDiscoveryHourChanged);
});

var vlc = require('vlc')([
  '-I', 'dummy',
  '-V', 'dummy',
  '--verbose', '1',
  '--sout=#http{dst=:8080/stream.mp3}'
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
	// update the current track with the new context
	redis.set('currentTrack', track, function (err, reply) {
		if (err) winston.info('onGotContext', err, reply);
	});
}

function onGotAllContext(track) {
	var activeUserCount = _.keys(active(users)).length;
	var trackContextCount = _.keys(track.context).length;
	if (activeUserCount > 1 && activeUserCount == trackContextCount) {
		// it's a bingo!
		track.bingo = true;
		redis.set('currentTrack', track, function (err, reply) {
			if (err) winston.info('onGotAllContext', err, reply);
		});

	}
}

function playTrack() {
	redis.set('skippers', [], function (err, reply) {
		winston.info('Skippers cleared', err, reply);

		handlers = {
			success: function(track, port) {
				var media = vlc.mediaFromUrl('http://localhost:' + port);
				media.parseSync();
				vlc.mediaplayer.media = media;
				vlc.mediaplayer.play();

				// add a timestamp to the track as we start it
				track.timestamp = new Date().getTime();

				lastfm.updateNowPlaying(track, users);
				//redis.set('currentTrack', track, function (err, reply) { winston.info('currentTrack set', err, reply); });
				lastfm.getContext(track, active(users), onGotContext, onGotAllContext);
			},
			error: function(error) {
				winston.error("playTrack", error.message);
				onEndTrack();
			}
		};

		track = tracks.shift();
		
		if (_.has(track, 'request')) {
			spotify.request(track, handlers);
		} else {
			spotify.search(track, handlers);
		}
	});
}

function onEndTrack() {
	winston.info("onEndTrack");

	redis.get('currentTrack', function (err, currentTrack) {
		lastfm.scrobble(currentTrack, users, skippers);
		
		if (requests.length > 0) {
			// there's a request, so cue it and play now
			tracks.unshift(requests.shift());
			playTrack();
		} else {
			// there are no requests so continue playing the radio
			if (currentStationUrl != lastfm.getStationUrl(active(users))) {
				// The station is different so clear tracks and retune
				tracks = [];
				redis.set('currentTrack', {}, function (err, reply) {
					currentStationUrl = lastfm.radioTune(active(users), onRadioTuned);
				});
			} else {
				// the station is the same
				if (tracks.length > 0) {
					// there are more tracks to play so continue playing them
					playTrack();
				} else {
					// clear the current track while we fetch the new playlist
					redis.set('currentTrack', {}, function (err, reply) {
						lastfm.getPlaylist(onRadioGotPlaylist);
					});
				}
			}
		}
	});
}

vlc.mediaplayer.on('EndReached', function () {
	// we can't start another track from within a
	// vlc callback (not reentrant) so we _.defer it
	_.defer(onEndTrack);
});

function onRadioGotPlaylist(xspf) {
	winston.info('onRadioGotPlaylist', xspf.playlist.trackList.track.length);

	tracks = xspf.playlist.trackList.track;

	playTrack();
};

function onRadioTuned(data) {
	winston.info('onRadioTuned', data.url);
	lastfm.getPlaylist(onRadioGotPlaylist);
};

function onUsersChanged(err, newUsers) {
	winston.info('onUsersChanged', _.keys(newUsers));

	if ( !_.isEmpty(active(newUsers)) && _.isEmpty(active(users))
			&& !vlc.mediaplayer.is_playing ) {
		// we've gone from no users to some users
		// and we're not already playing so start
		winston.info('START!');
		currentStationUrl = lastfm.radioTune(active(newUsers), onRadioTuned); 
	}

	users = newUsers;
}

function onSkippersChanged(err, newSkippers) {
	winston.info('onSkippersChanged:', newSkippers);
	skippers = newSkippers; 

	if ( _.keys(active(users)).length > 0
			&& newSkippers.length > 0
			&& newSkippers.length >= Math.ceil(_.keys(active(users)).length / 2) ) {
		winston.info('SKIP!');
		onEndTrack();
	}
}

function onTagsChanged(err, newTags) {
	winston.info('onTagsChanged: ', newTags);

	// clear the track list so that the tag change is in effect from the next track
	lastfm.setTags(newTags);
}

function onDiscoveryHourChanged(err, discoveryHour) {
	winston.info('Start discovery hour!');
	lastfm.setDiscoveryHourStart(discoveryHour.start);
}

function updateProgress() {
	redis.get('currentTrack', function (err, currentTrack) {
		var actualPosition = (vlc.mediaplayer.position * vlc.mediaplayer.length) / currentTrack.duration;
		doSend('/progress', {progress: actualPosition});
	});
}

setInterval(updateProgress, 500);

function doSend(path, payload) {
	request.post('http://localhost:3001' + path, {json:payload}, function (error, response, body) {
		if (error) {
			winston.error("doSend", error)
		} else if (response.statusCode != 200) {
			winston.error("doSend: STATUS CODE != 200", response.body);
		}
	});
}

var express = require('express');
var app = express();

app.use(express.bodyParser());

app.post('/request', function (req, res){
	winston.info("Got a Spotify request!", req.body);
	requests.push(req.body);
    res.end();
});

app.use(function (req, res){
	res.send(404);
});

app.listen(3002);
winston.info('Listening internally on port %s', 3002);

process.on('SIGINT', function () {
	winston.info( "\nShutting down!" );

	redis.set('currentTrack', {}, function (err, reply) {
		winston.info("currentTrack cleared", err, reply);
		redis.set('skippers', [], function (err, reply) {
			winston.info("skippers cleared.", err, reply);
			spotify.logout();
			spotify.once('logout', function (err) {
				winston.info("Spotify logged out!\n***EXIT***", err);
				process.exit();
			});
		});
	});
})


