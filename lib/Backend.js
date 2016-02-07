"use strict";

module.exports = function(dataStore, currentTrackManager, lastfm, spotify, skippers, socket, chat, logger) {
    var tracks = [];
    var requests = [];
    var currentStationUrl = "";

    spotify.relogin();

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
        logger.winston.info("onGotContext");

        var activeUserCount = Object.keys(active(dataStore.get(USERS_KEY))).length;
        var trackContextCount = Object.keys(track.context).length;

        if (activeUserCount > 1 && activeUserCount === trackContextCount) {
            // it's a bingo!
            track.bingo = true;
        }

        currentTrackManager.setCurrentTrack(track);
    }

    function playTrack() {
        skippers.clear();

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
                logger.winston.error("playTrack", error.message);
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
                logger.winston.info("There was no spotify link for", nextTrack);
                onEndTrack();
            }
        }
    }

    function onEndTrack() {
        logger.winston.info("onEndTrack");

        var currentTrack = currentTrackManager.getCurrentTrack();

        lastfm.scrobble(currentTrack, dataStore.get(USERS_KEY), skippers.getSkippers());

        // clear the current track before doing anything else
        currentTrackManager.setCurrentTrack({});

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

                logger.winston.info("check Radio", stationUrl);

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
        logger.winston.info("onRadioGotPlaylist", lfm.playlist.length);

        tracks = lfm.playlist;

        onEndTrack();
    }

    function onUsersChanged(newUsers, oldUsers) {
        logger.winston.info("onUsersChanged", oldUsers, newUsers, vlc.mediaplayer.is_playing);

        if (Object.keys(active(newUsers)).length !== 0 && Object.keys(active(oldUsers)).length === 0
                && !vlc.mediaplayer.is_playing ) {
            // we've gone from no users to some users
            // and we're not already playing so start
            logger.winston.info("START!");
            currentStationUrl = lastfm.getStationUrl(active(newUsers), lastfm.alphabetSort);
            lastfm.getPlaylist(active(newUsers), onRadioGotPlaylist);
        }
    }

    skippers.on("change", function(newSkippers) {
        logger.winston.info("skippers shanged", newSkippers);

        var users = dataStore.get(USERS_KEY);

        if ( Object.keys(active(users)).length > 0
                && newSkippers.length > 0
                && newSkippers.length >= Math.ceil(Object.keys(active(users)).length / 2) ) {
            logger.winston.info("SKIP!");
            onEndTrack();
        }
    });

    function onTagsChanged(newTags) {
        logger.winston.info("onTagsChanged: ", newTags);

        // clear the track list so that the tag change is in effect from the next track
        lastfm.setTags(newTags);
    }

    function onDiscoveryHourChanged(discoveryHour) {
        logger.winston.info("Start discovery hour!");
        lastfm.setDiscoveryHourStart(discoveryHour.start);
    }

    function updateProgress() {
        var currentTrack = currentTrackManager.getCurrentTrack();
        var actualPosition = (vlc.mediaplayer.position * vlc.mediaplayer.length) / currentTrack.duration;
        socket.broadcast("progress", actualPosition);
    }

    socket.on("request", function (user, track) {
        requests.push({username: user.username, request: track.uri});
        chat.spotifyRequest(user, track);
    });

    // Get initial values
    onTagsChanged(dataStore.get(TAGS_KEY));
    onDiscoveryHourChanged(dataStore.get(DISCOVERY_HOUR_KEY));
    onUsersChanged(dataStore.get(USERS_KEY));

    // listen for changes
    dataStore.on(USERS_KEY, onUsersChanged);
    dataStore.on(TAGS_KEY, onTagsChanged);
    dataStore.on(DISCOVERY_HOUR_KEY, onDiscoveryHourChanged);

    setInterval(updateProgress, 2000);

    process.on("SIGINT", function () {
        logger.winston.info( "\nShutting down!" );

        spotify.logout();
        spotify.once("logout", function (err) {
            logger.winston.info("Spotify logged out!\n***EXIT***", err);
            throw (0);
        });
    });
};

