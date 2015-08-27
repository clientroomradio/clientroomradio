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
var lastfm = new Lastfm(config, winston, redis, request);

var users = {};
var tracks = [];
var requests = [];
var skippers = [];
var currentStationUrl = "";

spotify.relogin();

var CURRENT_TRACK_KEY = "currentTrack";
var SKIPPERS_KEY = "skippers";
var TAGS_KEY = "tags";
var DISCOVERY_HOUR_KEY = "discoveryHour";
var USERS_KEY = "users";

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
    redis.set(SKIPPERS_KEY, [], function (err, reply) {
        winston.info("Skippers cleared", reply);

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
                _.defer(onEndTrack);
            }
        };

        var nextTrack = tracks.shift();

        if (_.has(nextTrack, "request")) {
            spotify.playTrack(nextTrack.request, handlers);
        } else {
            // find the spotify links
            var spotifyPlayLinks = _.filter(nextTrack.playlinks, function (playlink) { return playlink.affiliate === "spotify"; } );
            if (spotifyPlayLinks.length > 0) {
                // there is at least 1 spotify play link so use the first one!
                var spotifyUrl = spotifyPlayLinks[0].url;
                spotify.playTrack(spotifyUrl, handlers);
            } else {
                // There were no spotify tracks so go to the next track
                winston.info("There was no spotify link for", nextTrack);
                _.defer(onEndTrack);
            }
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
                    var stationUrl = lastfm.getStationUrl(active(users), lastfm.alphabetSort);

                    winston.info("check Radio", stationUrl);

                    if (currentStationUrl !== stationUrl) {
                        // The station is different so clear tracks and retune
                        tracks = [];
                        lastfm.getPlaylist(active(users), onRadioGotPlaylist);
                        currentStationUrl = stationUrl;
                    } else {
                        // the station is the same
                        if (tracks.length > 0) {
                            // there are more tracks to play so continue playing them
                            playTrack();
                        } else {
                            // fetch a new playlist
                            lastfm.getPlaylist(active(users), onRadioGotPlaylist);
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

function onRadioGotPlaylist(lfm) {
    winston.info("onRadioGotPlaylist", lfm.playlist.length);

    tracks = lfm.playlist;

    onEndTrack();
}

function onUsersChanged(err, newUsers) {
    winston.info("onUsersChanged", _.keys(newUsers), err);

    if ( !_.isEmpty(active(newUsers)) && _.isEmpty(active(users))
            && !vlc.mediaplayer.is_playing ) {
        // we"ve gone from no users to some users
        // and we"re not already playing so start
        winston.info("START!");
        currentStationUrl = lastfm.getStationUrl(active(users), lastfm.alphabetSort);
        lastfm.getPlaylist(active(users), onRadioGotPlaylist);
    }

    users = newUsers;
}

function onSkippersChanged(err, newSkippers) {
    winston.info("onSkippersChanged:", newSkippers, err);
    skippers = newSkippers;

    if ( _.keys(active(users)).length > 0
            && newSkippers.length > 0
            && newSkippers.length >= Math.ceil(_.keys(active(users)).length / 2) ) {
        winston.info("SKIP!");
        onEndTrack();
    }
}

function onTagsChanged(err, newTags) {
    winston.info("onTagsChanged: ", newTags, err);

    // clear the track list so that the tag change is in effect from the next track
    lastfm.setTags(newTags);
}

function onDiscoveryHourChanged(err, discoveryHour) {
    winston.info("Start discovery hour!", err);
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
    redis.get(TAGS_KEY, onTagsChanged);
    redis.get(DISCOVERY_HOUR_KEY, onDiscoveryHourChanged);
    redis.get(SKIPPERS_KEY, onSkippersChanged);
    redis.get(USERS_KEY, onUsersChanged);

    // listen for changes
    redis.on(USERS_KEY, onUsersChanged);
    redis.on(SKIPPERS_KEY, onSkippersChanged);
    redis.on(TAGS_KEY, onTagsChanged);
    redis.on(DISCOVERY_HOUR_KEY, onDiscoveryHourChanged);
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

app.listen(config.backendPort);
winston.info("Listening internally on port %s", config.backendPort);

process.on("SIGINT", function () {
    winston.info( "\nShutting down!" );

    redis.set(CURRENT_TRACK_KEY, {}, function (ctErr, ctReply) {
        winston.info("currentTrack cleared", ctErr, ctReply);
        redis.set(SKIPPERS_KEY, [], function (sErr, sReply) {
            winston.info("skippers cleared.", sErr, sReply);
            spotify.logout();
            spotify.once("logout", function (lErr) {
                winston.info("Spotify logged out!\n***EXIT***", lErr);
                throw (0);
            });
        });
    });
});


