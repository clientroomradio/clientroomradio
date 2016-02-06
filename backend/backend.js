"use strict";

module.exports = function(dataStore) {
    var config = require("../config.js");
    var request = require("request");
    var winston = require("winston");

    var Spotify = require("./src/spotify.js");
    var Lastfm = require("./src/lastfm.js");

    winston.add(winston.transports.File, { filename: "backend.log" });
    winston.remove(winston.transports.Console);
    winston.add(winston.transports.Console, { timestamp: true });

    var spotify = new Spotify(winston);
    var lastfm = new Lastfm(config, winston, dataStore, request);

    var tracks = [];
    var requests = [];
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

        var activeUserCount = Object.keys(active(dataStore.get(USERS_KEY))).length;
        var trackContextCount = Object.keys(track.context).length;

        if (activeUserCount > 1 && activeUserCount === trackContextCount) {
            // it's a bingo!
            track.bingo = true;
        }

        dataStore.set(CURRENT_TRACK_KEY, track);
    }

    function playTrack() {
        dataStore.set(SKIPPERS_KEY, []);

        var handlers = {
            success: function(track, port) {
                var media = vlc.mediaFromUrl("http://localhost:" + port);
                media.parseSync();
                vlc.mediaplayer.media = media;
                vlc.mediaplayer.play();

                // add a timestamp to the track as we start it
                track.timestamp = new Date().getTime();

                var users = dataStore.get(USERS_KEY);
                lastfm.updateNowPlaying(track, users);
                lastfm.getContext(track, active(users), onGotContext);
            },
            error: function(error) {
                winston.error("playTrack", error.message);
                onEndTrack();
            }
        };

        var nextTrack = tracks.shift();

        if (nextTrack.hasOwnProperty("request")) {
            spotify.playTrack(nextTrack.request, handlers);
        } else {
            // find the spotify links
            var spotifyPlayLinks = nextTrack.playlinks.filter(function (playlink) {
                return playlink.affiliate === "spotify";
            });

            if (spotifyPlayLinks.length > 0) {
                // there is at least 1 spotify play link so use the first one!
                spotify.playTrack(spotifyPlayLinks[0].url, handlers, nextTrack);
            } else {
                // There were no spotify tracks so go to the next track
                winston.info("There was no spotify link for", nextTrack);
                onEndTrack();
            }
        }
    }

    function onEndTrack() {
        winston.info("onEndTrack");

        var currentTrack = dataStore.get(CURRENT_TRACK_KEY);

        lastfm.scrobble(currentTrack, dataStore.get(USERS_KEY), dataStore.get(SKIPPERS_KEY));

        // clear the current track before doing anything else
        dataStore.set(CURRENT_TRACK_KEY, {});

        var users = dataStore.get(USERS_KEY);

        if (Object.keys(active(users)).length > 0) {
            // there are some users so play next track
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
        }
    }

    vlc.mediaplayer.on("EndReached", function () {
        onEndTrack();
    });

    function onRadioGotPlaylist(lfm) {
        winston.info("onRadioGotPlaylist", lfm.playlist.length);

        tracks = lfm.playlist;

        onEndTrack();
    }

    function onUsersChanged(newUsers, oldUsers) {
        winston.info("onUsersChanged", oldUsers, newUsers, vlc.mediaplayer.is_playing);

        if (Object.keys(active(newUsers)).length !== 0 && Object.keys(active(oldUsers)).length === 0
                && !vlc.mediaplayer.is_playing ) {
            // we've gone from no users to some users
            // and we're not already playing so start
            winston.info("START!");
            currentStationUrl = lastfm.getStationUrl(active(newUsers), lastfm.alphabetSort);
            lastfm.getPlaylist(active(newUsers), onRadioGotPlaylist);
        }
    }

    function onSkippersChanged(skippers) {
        winston.info("onSkippersChanged:", skippers);

        var users = dataStore.get(USERS_KEY);

        if ( Object.keys(active(users)).length > 0
                && skippers.length > 0
                && skippers.length >= Math.ceil(Object.keys(active(users)).length / 2) ) {
            winston.info("SKIP!");
            onEndTrack();
        }
    }

    function onTagsChanged(newTags) {
        winston.info("onTagsChanged: ", newTags);

        // clear the track list so that the tag change is in effect from the next track
        lastfm.setTags(newTags);
    }

    function onDiscoveryHourChanged(discoveryHour) {
        winston.info("Start discovery hour!");
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
        var currentTrack = dataStore.get(CURRENT_TRACK_KEY);
        var actualPosition = (vlc.mediaplayer.position * vlc.mediaplayer.length) / currentTrack.duration;
        doSend("/progress", {progress: actualPosition});
    }

    // Get initial values
    onTagsChanged(dataStore.get(TAGS_KEY));
    onDiscoveryHourChanged(dataStore.get(DISCOVERY_HOUR_KEY));
    onSkippersChanged(dataStore.get(SKIPPERS_KEY));
    onUsersChanged(dataStore.get(USERS_KEY));

    // listen for changes
    dataStore.on(USERS_KEY, onUsersChanged);
    dataStore.on(SKIPPERS_KEY, onSkippersChanged);
    dataStore.on(TAGS_KEY, onTagsChanged);
    dataStore.on(DISCOVERY_HOUR_KEY, onDiscoveryHourChanged);

    setInterval(updateProgress, 2000);

    var express = require("express");
    var bodyParser = require("body-parser");
    var app = express();

    app.use(bodyParser.json());

    app.post("/request", function (req, res) {
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

        dataStore.set(CURRENT_TRACK_KEY, {});
        winston.info("currentTrack cleared");
        dataStore.set(SKIPPERS_KEY, []);
        winston.info("skippers cleared.");
        spotify.logout();
        spotify.once("logout", function (err) {
            winston.info("Spotify logged out!\n***EXIT***", err);
            throw (0);
        });
    });
};

