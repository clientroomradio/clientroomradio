var _ = require("underscore");
var config = require("../config.js");
var fs = require('fs');
var request = require('request');
var util = require('util');

var Spotify = require('./src/spotify.js');
var Lastfm = require('./src/lastfm.js');
var Redis = require('../shared/src/redis.js');

var spotify = new Spotify();
var lastfm = new Lastfm();
var redis = new Redis('backend', 'frontend');

var users = {};
var tracks = [];
var requests = [];
var skippers = [];
var currentStationUrl = '';

redis.on("ready", function () {
    console.log("redis ready");

    redis.get('tags', onTagsChanged);
    
	redis.get('users', function (err, users) {
        currentStationUrl = lastfm.radioTune(active(users), onRadioTuned);
    });	

    redis.on('users', onUsersChanged);
    redis.on('skippers', onSkippersChanged);
    redis.on('tags', onTagsChanged);
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
			redis.set('currentTrack', track);
		}
	});
}

function playTrack() {
	track = tracks.shift();
	play_mp3(track.location);

	// if it's a Spotify track, get the context now
	if (fs.existsSync(track.location)) {
		console.log("GET CONTEXT FOR SPOTIFY TRACK");
		lastfm.getContext(track, active(users), onGotContext);
	}

	console.log("PLAYING TRACK:", track.title, '-', track.creator);

	// add a timestamp to the track as we start it
	track.timestamp = new Date().getTime();

	lastfm.updateNowPlaying(track, users);

	redis.set('currentTrack', track);
	redis.set('skippers', []);
}

function onEndTrack() {
	console.log("onEndTrack");

	redis.get('currentTrack', function (err, currentTrack) {
		lastfm.scrobble(currentTrack, users, skippers);

		// If there's a request, add it to the front of the queue now
		if (requests.length > 0) {
			tracks.unshift(requests.shift());
		}

		// check if there are more songs to play
		if (tracks.length > 0) {
			playTrack();
		}
		else {
			// we were unable to play another track so clear the current one
			redis.set('currentTrack', {});

			// there are no more tracks in the current playlist
			if ( lastfm.getStationUrl(active(users)) != currentStationUrl ) {
				lastfm.radioTune(active(users), onRadioTuned);
			}
			else {
				// just get another playlist
				lastfm.getPlaylist(onRadioGotPlaylist);
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
	console.log(data);

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
	console.log('onUsersChanged: ', util.inspect(newUsers, false, null));

	if ( currentStationUrl != lastfm.getStationUrl(active(newUsers)) ) {
		// the users have changed so we'll need to retune
		// clearing the tracks will make this happen
		console.log("Station change!");
		tracks = [];
	}

	var start = !_.isEmpty(active(newUsers)) && _.isEmpty(active(users));

	users = newUsers;

	if ( start && !vlc.mediaplayer.is_playing ) {
		// we've gone from no users to some users so start
		currentStationUrl = lastfm.radioTune(active(users), onRadioTuned); 
	}
}

function onSkippersChanged(err, newSkippers) {
	console.log('onSkippersChanged:', util.inspect(newSkippers, false, null));

	if ( _.keys(active(users)).length > 0 && newSkippers.length >= Math.ceil(_.keys(active(users)).length / 2) ) {
		console.log('SKIP!');
		onEndTrack();
	}
}

function onTagsChanged(err, newTags) {
	console.log('onTagsChanged: ', util.inspect(newTags, false, null));

	// clear the track list so that the tag change is in effect from the next track
	tracks = [];
	lastfm.setTags(newTags);
}

function play_mp3(mp3) {
	console.log(mp3);

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
			console.log("ERR", error)
		} else if (response.statusCode != 200) {
			console.log("STATUS CODE != 200: ", response.body);
		}
	});
}

var express = require('express');
var app = express();

app.use(express.bodyParser());

app.post('/request', function (req, res){
	console.log("Got a Spotify request!", req.body);
	spotify.request(req.body);
    res.end();
});

app.post('/discovery', function (req, res){
	console.log("Start discovery hour!", req.body);
	lastfm.startDiscoveryHour();
	tracks = []; // clear the track queue so that we start a new station
    res.end();
});

app.use(function(req, res){
	res.send(404);
});

app.listen(3002);
console.log('Listening internally on port %s', 3002);

process.on('SIGINT', function () {
	console.log( "\nShutting down!" );

	redis.set('currentTrack', {}, function (err, reply) {
		console.log( "currentTrack cleared" );
		redis.set('skippers', [], function (err, reply) {
			console.log( "skippers cleared.\nExit..." );
			process.exit();
		} );
	} );
})


