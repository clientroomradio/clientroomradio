
var users = {};
var tracks = [];
var skippers = [];
var currentStation = '';
var _ = require("underscore");
var config = require("../config.js");
var fs = require("fs");

var LastFmNode = require('lastfm').LastFmNode;

if ( !fs.existsSync('../rebus-storage') ) {
	fs.mkdirSync('../rebus-storage');
	fs.writeFileSync('../rebus-storage/users.json', "{}");
	fs.writeFileSync('../rebus-storage/skippers.json', "[]");
	fs.writeFileSync('../rebus-storage/currentTrack.json', "{}");
}

var vlc = require('vlc')([
  '-I', 'dummy',
  '-V', 'dummy',
  '--verbose', '1',
  '--sout=#http{dst=:8080/stream.mp3}'
]);

// Array of HttpServerResponse objects that are listening clients.
var clients = [];
// The max number of listening clients allowed at a time.
var maxClients = 15;

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

function updateNowPlaying(track) {
	// always scrobble to clientroom
	doUpdateNowPlaying("clientroom", config.sk, track);

	_.each(users, function(data, user) {
		doUpdateNowPlaying(user, data.sk, track);
	});
}

function doScrobble(username, session_key, track) {
	var request = lastfm.request("track.scrobble", {
		"album[0]": track.album,
		"track[0]": track.title,
		"artist[0]": track.creator,
		"timestamp[0]": Math.round(track.timestamp / 1000),
		"duration[0]": Math.round(track.duration / 1000),
		sk: session_key,
		"streamid[0]": track.extension.streamid,
		"chosenByUser[0]": "0",
		handlers: {
			success: function(lfm) {
				console.log("Scrobbled track for:", username);
			},
			error: function(error) {
				console.log("Scrobble error:" + error.message);
			}
		}
	});
}

function scrobble(track) {
	if ( new Date().getTime() - track.timestamp > track.duration / 2 ) {
		// we've listened to more than half the song
		doScrobble("clientroom", config.sk, track);

		_.each(users, function(data, user) {
			if ( !_.contains(_.keys(skippers), user) ) {
				// the user hasn't voted to skip this track
				doScrobble(user, data.sk, track);
			}
		});
	}
}

function getStation() {
	return 'lastfm://tag/under a minute';

	var stationUsers = '';

	for ( username in users ) {
		if ( stationUsers.length > 0 )
			stationUsers += ',' + username;
		else
			stationUsers += username;
	}

	return 'lastfm://users/' + stationUsers + '/personal';
}

function onComplete(err) {
	if ( err ) {
		console.log('There was a rebus updating error:', err);
	}
}

function playTrack() {
	var track = tracks.shift();
	console.log(track.title, '-', track.creator);

	// add a timestamp to the track as we start it
	track.timestamp = new Date().getTime();

	updateNowPlaying(track);

	bus.publish('currentTrack',	track, onComplete);
	bus.publish('skippers', [], onComplete );

	getmp3(track.location);
}

function onEndTrack() {
	scrobble(bus.value.currentTrack);

	// check if there are more songs to play

	if ( tracks.length == 0 ) {
		// there are no more tracks in the current playlist

		if ( getStation() != currentStation ) {
			radioTune();
		}
		else {
			// just get another playlist
			getPlaylist();
		}
	}
	else {
		playTrack();
	}
}

function onRadioGotPlaylist(data) {
	tracks = data.playlist.trackList.track;

	// get all the contexts and insert them into the tracks

	_.each(tracks, function(track) {

		console.log(track);

		_.each(users, function(data,user) {
			var request = lastfm.request("track.getInfo", {
				track: track.title,
				artist: track.creator,
				username: user,
				handlers: {
					success: function(lfm) {
						console.log(track.title, user, lfm.track.userplaycount)
						track.context = track.context || [];
						track.context.push({"username":user,"userplaycount":lfm.track.userplaycount,"userloved":lfm.track.userloved});
					},
					error: function(error) {
						console.log("Error: " + error.message);
					}
				}
			});
		});
	});

	console.log(tracks);

	playTrack();
};

function getPlaylist() {
		var request = lastfm.request("radio.getplaylist", {
		sk: config.sk,
		handlers: {
			success: onRadioGotPlaylist,
			error: function(error) {
				console.log("Error: " + error.message);
			}
		}
	});
}

function onRadioTuned(data) {
	getPlaylist();
};

function radioTune() {
	if ( !_.isEmpty(users) ) {
		currentStation = getStation();

		console.log( currentStation );

		var request = lastfm.request("radio.tune", {
			station: currentStation,
			sk: config.sk,
			handlers: {
				success: onRadioTuned,
				error: function(error) {
					console.log("Error: " + error.message);
				}
			}
		});
	}
}

var rebus = require('rebus');

var bus = rebus('../rebus-storage', function(err) {
  
  var usersNotification = bus.subscribe('users', function(obj) {
  	// the users have changed so we'll need to retune
    // clearing the tracks will make this happen
  	tracks = [];

  	var start = (_.isEmpty(users) && !_.isEmpty(obj))
	users = obj;

  	if ( start ) {
  		// we've gone from no users to some users so start
  		radioTune(); 
  	}
  });

  var skippersNotification = bus.subscribe('skippers', function(aSkippers) {
  	skippers = aSkippers;
  	if ( _.keys(users).length > 0 && _.keys(skippers).length >= Math.ceil(_.keys(users).length / 2) ) {
  		console.log( "SKIP!" );
  		player.pause();
  	}
  });

  users = bus.value.users;
  radioTune();
});

function checkPlayingState() {
	if (player.is_playing) {
		setTimeout(checkPlayingState, 500);
	} else {
		onEndTrack();
	}
}

var player;


function getmp3(mp3) {
	var media = vlc.mediaFromUrl(mp3);
	media.parseSync();
	player = vlc.mediaplayer;
	player.media = media;
	console.log('Media duration:', media.duration);
	player.play();

	setTimeout(checkPlayingState, 10000);
}




