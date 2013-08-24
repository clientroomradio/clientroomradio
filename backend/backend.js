
var users = {};
var tracks = [];
var skippers = [];
var currentStation = '';
var _ = require("underscore");
var config = require("../config.js");

var LastFmNode = require('lastfm').LastFmNode;

var http = require("http");
var url = require("url");

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
				console.log("updated now playing for:", username);
			},
			error: function(error) {
				console.log("Error: " + error.message);
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
				console.log("updated now playing for:", username);
			},
			error: function(error) {
				console.log("Error: " + error.message);
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
	setTimeout(doOnEndTrack, 15000);
}

function doOnEndTrack() {
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
  	if ( _.keys(skippers).length >= Math.ceil(_.keys(users).length / 2) ) {
  		console.log( "SKIP!" );
  	}
  });

  users = bus.value.users;
  radioTune();
});

function onMp3Data(chunk) {
	process.stdout.write(".");
	for ( var i = 0 ; i < clients.length ; i++ ) {
		clients[i].write(chunk);
	}
}

function onMp3Error(e) {
	console.log("Got error: " + e.message);
}

function getmp3(mp3) {

  http.get(mp3, function(resource) {
    console.log("Got response: " + resource.statusCode);

    if (resource.statusCode > 300 && resource.statusCode < 400 && resource.headers.location) {
	    // The location for some (most) redirects will only contain the path,  not the hostname;
	    // detect this and add the host to the path.
	    if (url.parse(resource.headers.location).hostname) {
	    	console.log("YEAH");
	          // Hostname included; make request to res.headers.location
	          http.get(resource.headers.location, function(redirResource) {
	          	redirResource.on("data", onMp3Data).on('error', onMp3Error ).on('end', onEndTrack);
	          });

	    } else {
	          // Hostname not included; get host from requested URL (url.parse()) and prepend to location.
	          console.log("FUCK");
	    }

	// Otherwise no redirect; capture the response as normal            
	} else {
	    resource.on("data", onMp3Data).on('error', onMp3Error ).on('end', onEndTrack);
	}
  });
}

// Now we create the HTTP server.
http.createServer(function(req, res) {

  // Does the client support icecast metadata?
  var acceptsMetadata = req.headers['icy-metadata'] == 1;

  if (req.url == "/stream.mp3") {
    
    // Sorry, too busy, try again later!
    if (clients.length >= maxClients) {
      res.writeHead(503);
      return res.end("The maximum number of clients ("+maxClients+") are aleady connected, try connecting again later...")
    }

    var headers = {
      "Content-Type": "audio/mpeg",
      "Connection": "close",
      "Transfer-Encoding": "identity"
    };

    res.writeHead(200, headers);

    clients.push(res);
    
    console.log("Client Connected: "+req.connection.remoteAddress+"!" + " Total " + clients.length);
    
    req.connection.on("close", function() {
      // This occurs when the HTTP client closes the connection.
      clients.splice(clients.indexOf(res), 1);
      console.error("Client Disconnected: "+req.connection.remoteAddress+" :(" + " Total " + clients.length);
    });

  }

}).listen(5555, function() {
  console.error("HTTP Icecast server listening at: "+ "http://*:" + this.address().port);
});

process.on('uncaughtException', function(e) {
  console.error("UNCAUGHT EXCEPTION:", e.message);
  console.error(e.stack);
});



