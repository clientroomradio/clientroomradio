
var users = {};
var tracks = [];
var skippers = [];
var requests = [];
var vlcPlayer;
var currentStation = '';
var _ = require("underscore");
var config = require("../config.js");
var fs = require("fs");
var rebus = require('rebus');
var http = require('http');

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
		if ( !_.contains(aUsers[user], "active") || aUsers[user].active ) {
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
	if ( requests.length > 0 ) {
		var request = JSON.parse(requests.shift());
		playSpotifyTrack(request.request);
	}
	else {
		var track = tracks.shift();
		console.log("PLAYING TRACK:", track.title, '-', track.creator);

		// add a timestamp to the track as we start it
		track.timestamp = new Date().getTime();

		updateNowPlaying(track);

		bus.publish('currentTrack', track, onComplete );
		bus.publish('skippers', [], onComplete );

		//doSend('/newtrack', track);

		getmp3(track.location);
	}
}

function onEndTrack() {
	scrobble(bus.value.currentTrack);

	// clear the current track so that it doesn't get scrobbled again
	// and so the UI is correct if there are no more tracks
	bus.publish('currentTrack', {}, onComplete);

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
		console.log( "SKIP!" );
		vlcPlayer.pause();
		sendChatMessage("SKIP!");
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

function getmp3(mp3) {
	var media = vlc.mediaFromUrl(mp3);
	media.parseSync();
	vlcPlayer = vlc.mediaplayer;
	vlcPlayer.media = media;
	console.log('Media duration:', media.duration);
	vlcPlayer.play();

	setTimeout(checkPlayingState, 10000);
}

function updateProgress() {
	if (vlcPlayer) {
		doSend('/progress', '{"progress":' + vlcPlayer.position + '}');
	}
}

function sendChatMessage(message) {
	doSend('/chat', '{"message":"' + message + '"}');
}

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

setInterval(updateProgress, 500);

var lame = require('lame');
var sp = require('libspotify');

var spSession = new sp.Session({
	cache_location: __dirname + "/spCache/",
    settings_location: __dirname + "/spSettings/",
    applicationKey: __dirname + '/spotify_appkey.key'
});

function playSpotifyTrack(searchTerm) {
	console.log(searchTerm);

	spSession.relogin();

	spSession.once('login', function(err) {
	    if (err) {
	    	this.emit('error', err);
		}

	    var spSearch = new sp.Search(searchTerm);
	    spSearch.trackCount = 1; // we're only interested in the first result;
	    spSearch.execute();
	    spSearch.once('ready', function() {
	        if(!spSearch.tracks.length) {
	            console.log('there is no track to play :[');
	            spSession.logout();
	        }

	        var spTrack = spSearch.tracks[0];
	        var spPlayer = spSession.getPlayer();
	        spPlayer.load(spTrack);
	        spPlayer.play();

	        console.log(spTrack);

	        var currentTrack = {};
	        currentTrack.creator = spTrack.artists[0].name;
	        currentTrack.album = spTrack.album.name;
	        currentTrack.title = spTrack.title;
	        currentTrack.duration = String(spTrack.duration);
	        currentTrack.timestmp = new Date().getTime();
	        getContext( currentTrack );

	        updateNowPlaying(currentTrack);

			bus.publish('currentTrack', currentTrack, onComplete );
			bus.publish('skippers', [], onComplete );

			// VLC needs a file to play (and didn't seem to like being
			// given PCM data) so use lame to convert Spotify's PCM data
			// to mp3 and write that to a file that can be read by VLC
			var w = fs.createWriteStream('spTrack.mp3');
			var lameEncoder = new lame.Encoder();
			spPlayer.pipe(lameEncoder).pipe(w);

			var r = fs.createReadStream('spTrack.mp3');
		    var vlcMedia = vlc.mediaFromNode(r);
			vlcMedia.parseSync();
			vlcPlayer = vlc.mediaplayer;
			vlcPlayer.media = vlcMedia;

			// KLUDGE: wait one sec before playing
			// so there's some data in the buffer
			setInterval( function() { vlcPlayer.play(); }, 1000 );
			setTimeout(checkPlayingState, 10000);

	        spPlayer.on('data', function(buffer) {
	            // buffer.length
	            // buffer.rate
	            // buffer.channels
	            // 16bit samples
	        });

	        spPlayer.once('track-end', function() {
	            console.log('track ended');
	            spPlayer.stop();
	            spSession.logout();
	        });
	    });
	});
}

http.createServer(function (request, res) {


  console.log("got request");

  if (request.url == '/request') {
  	console.log("it's /request!")
	var body = '';
	request.on('data', function (data) {
		console.log(".");
		body += data;
	});
	request.on('end', function () {
		console.log(body);
		requests.push(body);
		res.writeHead(200, {'Content-Type': 'text/plain'});
  		res.end('');
	});
  }

}).listen(3002);

