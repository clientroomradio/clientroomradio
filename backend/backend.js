
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

function updateNowPlaying(track) {
	_.each(users, function(data, user) {
		var request = lastfm.request("track.updateNowPlaying", {
			album: track[0].album,
			track: track[0].title,
			artist: track[0].creator,
			duration: (track[0].duration / 1000),
			sk: data.sk,
			handlers: {
				success: function(lfm) {
					console.log("updated now playing for:", user);
				},
				error: function(error) {
					console.log("Error: " + error.message);
				}
			}
		});
	});
}

function scrobble(track) {
	if ( new Date().getTime() - track[0].timestamp > track[0].duration / 2 ) {
		// we've listened to more than half the song

		_.each(users, function(data, user) {
			if ( !_.contains(_.keys(skippers), user) ) {
				// the user hasn't voted to skip this track
				var request = lastfm.request("track.scrobble", {
					"album[0]": track[0].album,
					"track[0]": track[0].title,
					"artist[0]": track[0].creator,
					"timestamp[0]": Math.round(track[0].timestamp / 1000),
					"duration[0]": Math.round(track[0].duration / 1000),
					sk: data.sk,
					"streamid[0]": track[0].extension.streamid,
					"chosenByUser[0]": "0",
					handlers: {
						success: function(lfm) {
							console.log("updated now playing for:", user);
						},
						error: function(error) {
							console.log("Error: " + error.message);
						}
					}
				});
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
	var track = tracks.splice(0, 1);
	console.log(track[0].title, '-', track[0].creator);

	// add a timestamp to the track as we start it
	track[0].timestamp = new Date().getTime();

	updateNowPlaying(track);

	bus.publish('currentTrack',	track, onComplete);
	bus.publish('skippers', {}, onComplete );

	// simulate a song lasting 3 seconds
	// TODO: actually play the song
	setTimeout(onEndTrack, 10000);
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

  var skippersNotification = bus.subscribe('skippers', function(skippers) {
  	if ( _.keys(skippers).length >= Math.ceil(_.keys(users).length / 2) ) {
  		console.log( "SKIP!" );
  	}
  });

  users = bus.value.users;
  radioTune();
});



