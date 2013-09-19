
var users = {};
var tracks = [];
var skippers = [];
var vlcPlayer;
var currentStation = '';
var _ = require("underscore");
var config = require("../config.js");
var rebus = require('rebus');
var http = require('http');
var fs = require('fs');
var LastFmNode = require('lastfm').LastFmNode;
var Spotify = require('./src/spotify.js');
var spotify = new Spotify();

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

var lastfm = new LastFmNode({
	api_key: config.api_key,
	secret: config.secret,
	useragent: 'clientroomradio/v0.1 Client Room Radio'
});

spotify.on('downloadedTrack', function(track) {
	console.log("unshift track!");
	
	getContext(track);

    var getInfoRequest = lastfm.request("track.getInfo", {
        track: track.title,
        artist: track.creator,
        handlers: {
            success: function(lfm) {
                track.image = lfm.track.album.image[1]["#text"];
            }
        }
    });

	tracks.unshift(track);
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

function scrobble(track) {
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

function active(aUsers) {
	var activeUsers = {};

	for ( var user in aUsers ) {
		if ( aUsers[user].active ) {
			activeUsers[user] = aUsers[user];
		}
	}

	return activeUsers;
}

function getStation(aUsers) {
	aUsers = typeof aUsers !== 'undefined' ? aUsers : users;

	var stationUsers = '';

	for ( var user in active(aUsers) ) {
		if ( stationUsers.length > 0 )
			stationUsers += ',' + user;
		else
			stationUsers += user;
	}

	return 'lastfm://users/' + stationUsers + '/personal';
}

function onComplete(err) {
	if ( err ) {
		console.log('There was a rebus updating error:', err);
	}
}

function playTrack() {
	console.log("Play a Last.fm radio track.");
	track = tracks.shift();
	play_mp3(track.location);

	console.log("PLAYING TRACK:", track.title, '-', track.creator);

	// add a timestamp to the track as we start it
	track.timestamp = new Date().getTime();

	updateNowPlaying(track);

	bus.publish('currentTrack', track, onComplete );
	bus.publish('skippers', [], onComplete );
}

function onEndTrack() {
	scrobble(bus.value.currentTrack);

	// check if there are more songs to play
	if (tracks.length > 0) {
		playTrack();
	}
	else {
		// we were unable to play another track so clear the current one
		bus.publish('currentTrack', {}, onComplete );

		// there are no more tracks in the current playlist
		if ( getStation() != currentStation ) {
			radioTune();
		}
		else {
			// just get another playlist
			getPlaylist();
		}
	}
}

function getContext(track) {
	_.each(active(users), function(data,user) {
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

						if ( bus.value.currentTrack.timestamp == track.timestamp ) {
							// update the current track with the new context
							bus.publish('currentTrack', track, onComplete );
						}
					}
				},
				error: function(error) {
					console.log("Error: " + error.message);
				}
			}
		});
	});
}

function onRadioGotPlaylist(data) {
	tracks = data.playlist.trackList.track;

	// get all the contexts and insert them into the tracks
	_.each(tracks, function(track) {
		getContext(track);
	});

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
	currentStation = '';

	if ( !_.isEmpty(active(users)) ) {
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

function onUsersChanged(newUsers) {
	if ( currentStation != getStation(newUsers) ) {
		// the users have changed so we'll need to retune
		// clearing the tracks will make this happen
		tracks = [];
	 }

  	var start = (_.isEmpty(active(users)) && !_.isEmpty(active(newUsers)));
	users = newUsers;

  	if ( start ) {
  		// we've gone from no users to some users so start
  		radioTune(); 
  	}

}

function onSkippersChanged(newSkippers) {
	skippers = newSkippers;
	if ( vlcPlayer && _.keys(users).length > 0 && skippers.length >= Math.ceil(_.keys(users).length / 2) ) {
		console.log('SKIP');
		vlcPlayer.pause();
		doSend('/skip', '{}');
	}
}


var bus = rebus('../rebus-storage', function(err) {
	var usersNotification = bus.subscribe('users', onUsersChanged);
	var skippersNotification = bus.subscribe('skippers', onSkippersChanged);

	users = bus.value.users;
	radioTune();
});

function checkPlayingState() {
	if (vlcPlayer.is_playing) {
		setTimeout(checkPlayingState, 500);
	} else {
		onEndTrack();
	}
}

function play_mp3(mp3) {
	console.log(mp3);

	var media;
	if (fs.existsSync(mp3)) media = vlc.mediaFromFile(mp3);
	else media = vlc.mediaFromUrl(mp3);
	media.parseSync();
	vlcPlayer = vlc.mediaplayer;
	vlcPlayer.media = media;
	vlcPlayer.play();

	setTimeout(checkPlayingState, 10000);
}

function updateProgress() {
	if (vlcPlayer) {
		var actualPosition = (vlcPlayer.position * vlcPlayer.length) / bus.value.currentTrack.duration;
		doSend('/progress', '{"progress":' + actualPosition + '}');
	}
}

setInterval(updateProgress, 500);

function doSend(path, data) {
	var options = {
		hostname: 'localhost',
		port: 3001,
		path: path,
		method: 'POST',
		headers: {"content-type":"application/json"}
	};

	var req = http.request(options, function(res) {
		res.setEncoding('utf8');
		res.on('data', function (chunk) {
			console.log( path + ' BODY: ' + chunk);
		});
	});

	req.on('error', function(e) {
	  console.log('problem with ' + path + ' request: ' + e.message);
	});

	// write data to request body
	req.write(data);
	req.end();
}

http.createServer(function (request, res) {
  
  if (request.url == '/request') {
  	console.log("Got a request!");
	var body = '';
	request.on('data', function (data) {
		body += data;
	});

	request.on('end', function () {
		console.log(body);

		// we got all the data so reply and say everything was okay
		res.writeHead(200, {'Content-Type': 'text/plain'});
  		res.end('');

  		var request = JSON.parse( body );
  		spotify.request(request.request);
  	});
  }

}).listen(3002);

process.on('SIGINT', function() {
	console.log( "\nShutting down!" );

	bus.publish('currentTrack', {}, function() {
		console.log( "currentTrack cleared" );
		bus.publish('skippers', [], function() {
			console.log( "skippers cleared.\nExit..." );
			process.exit();
		} );
	} );
})


