
var users = {};
var tracks = [];
var currentStation = '';
var _ = require("underscore");
var config = require("../config.js");

var LastFmNode = require('lastfm').LastFmNode;

var lastfm = new LastFmNode({
	api_key: config.api_key,
	secret: config.secret,
	useragent: 'clientroomradio/v0.1 Client Room Radio'
});

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
	var track = tracks.splice(0, 1);
	console.log(track[0].title, '-', track[0].creator);

	bus.publish('currentTrack',	track, onComplete);
	bus.publish('skippers', {}, onComplete );

	// simulate a song lasting 3 seconds
	// TODO: actually play the song
	setTimeout(onEndTrack, 10000);
}

function onEndTrack() {
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

  var skippersNotification = bus.subscribe('skippers', function(skippers) {
  	if ( _.keys(skippers).length >= Math.ceil(_.keys(users).length / 2) ) {
  		console.log( "SKIP!" );
  	}
  });

  users = bus.value.users;
  radioTune();
});



