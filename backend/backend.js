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

spotify.on('downloadedTrack', function (track) {
	// get some extra info about the track and
	// push it to the end of the requests queue
	lastfm.trackGetAlbumArt(track);
	requests.push(track);

	var payload = {
		"track": track
	};

	doSend('/requestcomplete', payload);
});

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
	redis.get('currentTrack', function (err, currentTrack) {
		if ( currentTrack.timestamp == track.timestamp ) {
			// update the current track with the new context
			redis.set('currentTrack', track, function (err, reply) {
				winston.info('currentTrack set', err, reply);
			});
		}
	});
}

function playTrack() {
	track = tracks.shift();
	play_mp3(track.location);

	// if it's a Spotify track, get the context now
	if (fs.existsSync(track.location)) {
		winston.info("GET CONTEXT FOR SPOTIFY TRACK");
		lastfm.getContext(track, active(users), onGotContext);
	}

	winston.info("PLAYING TRACK:", track.title, '–', track.creator);

	// add a timestamp to the track as we start it
	track.timestamp = new Date().getTime();

	lastfm.updateNowPlaying(track, users);

	redis.set('currentTrack', track, function (err, reply) { winston.info('currentTrack set', err, reply); });
	redis.set('skippers', [], function (err, reply) { winston.info('skippers set', err, reply); });
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

function onRadioGotPlaylist(data) {
	winston.info(data);

	tracks = data.playlist.trackList.track;

	// get all the contexts and insert them into the tracks
	_.each(tracks, function(track) {
		lastfm.getContext(track, active(users), onGotContext);
	});

	playTrack();
};

function onRadioTuned(data) {
	lastfm.getPlaylist(onRadioGotPlaylist);
};

function onUsersChanged(err, newUsers) {
	winston.info('onUsersChanged: ', util.inspect(newUsers, false, null));

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
	winston.info('onSkippersChanged:', util.inspect(newSkippers, false, null));
	skippers = newSkippers; 

	if ( _.keys(active(users)).length > 0 && newSkippers.length >= Math.ceil(_.keys(active(users)).length / 2) ) {
		winston.info('SKIP!');
		onEndTrack();
	}
}

function onTagsChanged(err, newTags) {
	winston.info('onTagsChanged: ', util.inspect(newTags, false, null));

	// clear the track list so that the tag change is in effect from the next track
	lastfm.setTags(newTags);
}

function onDiscoveryHourChanged(err, discoveryHour) {
	winston.info('Start discovery hour!');
	lastfm.setDiscoveryHourStart(discoveryHour.start);
}

function play_mp3(mp3) {
	winston.info(mp3);

	var media;
	if (fs.existsSync(mp3)) media = vlc.mediaFromFile(mp3);
	else media = vlc.mediaFromUrl(mp3);
	media.parseSync();
	vlc.mediaplayer.media = media;
	vlc.mediaplayer.play();
}

function updateProgress() {
	redis.get('currentTrack', function (err, currentTrack) {
		var actualPosition = (vlc.mediaplayer.position * vlc.mediaplayer.length) / currentTrack.duration;

		payload = {
			"progress": actualPosition
		}

		doSend('/progress', payload);
	});
}

setInterval(updateProgress, 500);

function doSend(path, payload) {
	request.post('http://localhost:3001' + path, {json:payload}, function (error, response, body) {
		if (error) {
			winston.info("ERR", error)
		} else if (response.statusCode != 200) {
			winston.info("STATUS CODE != 200: ", response.body);
		}
	});
}

var express = require('express');
var app = express();

app.use(express.bodyParser());

app.post('/request', function (req, res){
	winston.info("Got a Spotify request!", req.body);
	spotify.request(req.body);
    res.end();
});

app.use(function(req, res){
	res.send(404);
});

app.listen(3002);
winston.info('Listening internally on port %s', 3002);

process.on('SIGINT', function () {
	winston.info( "\nShutting down!" );

	redis.set('currentTrack', {}, function (err, reply) {
		winston.info( "currentTrack cleared" );
		redis.set('skippers', [], function (err, reply) {
			winston.info( "skippers cleared." );
			spotify.logout();
			spotify.once('logout', function (err) {
				winston.info( "Spotify logged out!\n***EXIT***" );
				process.exit();
			});
		});
	});
})


