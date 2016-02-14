"use strict";

module.exports = function(userDao, currentTrackManager, lastfm, spotify, skippers, socket, chat, logger) {
    var tracks = [];
    var requests = [];
    var currentStationUrl = "";

    spotify.relogin();

    var vlc = require("vlc")([
      "-I", "dummy",
      "-V", "dummy",
      "--verbose", "1",
      "--sout=#http{dst=:8080/stream.mp3}"
    ]);

    function onGotContext(track) {
        var activeUserCount = userDao.getRadioUsernames().length;
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

                lastfm.updateNowPlaying(track, userDao.getScrobbleUsers());
                lastfm.getContext(track, userDao.getRadioUsernames(), onGotContext);
            },
            error: function(error) {
                logger.error("playTrack", error.message);
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
                logger.info("There was no spotify link for", nextTrack);
                onEndTrack();
            }
        }
    }

    function onEndTrack() {
        logger.info("onEndTrack");

        var currentTrack = currentTrackManager.getCurrentTrack();

        lastfm.scrobble(currentTrack, userDao.getScrobbleUsers(), skippers.getSkippers());

        // clear the current track before doing anything else
        currentTrackManager.setCurrentTrack({});

        var radioUsernames = userDao.getRadioUsernames();

        if (Object.keys(radioUsernames).length > 0) {
            // there are some users so play next track
            if (requests.length > 0) {
                // there's a request, so cue it and play now
                tracks.unshift(requests.shift());
                playTrack();
            } else {
                // there are no requests so continue playing the radio
                var stationUrl = lastfm.getStationUrl(radioUsernames, lastfm.alphabetSort);

                logger.info("check Radio", stationUrl);

                if (currentStationUrl !== stationUrl) {
                    // The station is different so clear tracks and retune
                    tracks = [];
                    lastfm.getPlaylist(radioUsernames, onRadioGotPlaylist);
                    currentStationUrl = stationUrl;
                } else {
                    // the station is the same
                    if (tracks.length > 0) {
                        // there are more tracks to play so continue playing them
                        playTrack();
                    } else {
                        // fetch a new playlist
                        lastfm.getPlaylist(radioUsernames, onRadioGotPlaylist);
                    }
                }
            }
        }
    }

    vlc.mediaplayer.on("EndReached", function () {
        onEndTrack();
    });

    function onRadioGotPlaylist(lfm) {
        logger.info("onRadioGotPlaylist", lfm.playlist.length);

        tracks = lfm.playlist;

        onEndTrack();
    }

    skippers.on("change", function(newSkippers) {
        logger.info("skippers shanged", newSkippers);

        var radioUsernames = userDao.getRadioUsernames();

        if ( Object.keys(radioUsernames).length > 0
                && newSkippers.length > 0
                && newSkippers.length >= Math.ceil(Object.keys(radioUsernames).length / 2) ) {
            chat.skipSuccessful(newSkippers);
            onEndTrack();
        }
    });

    function updateProgress() {
        var currentTrack = currentTrackManager.getCurrentTrack();
        var actualPosition = (vlc.mediaplayer.position * vlc.mediaplayer.length) / currentTrack.duration;
        userDao.broadcast("progress", actualPosition);
    }

    function startRadio(radioUsernames) {
        if (!vlc.mediaplayer.is_playing) {
            currentStationUrl = lastfm.getStationUrl(radioUsernames, lastfm.alphabetSort);
            lastfm.getPlaylist(radioUsernames, onRadioGotPlaylist);
        }
    }

    userDao.on("startRadio", startRadio);

    if (Object.keys(userDao.getRadioUsernames()).length > 0) {
        startRadio(userDao.getRadioUsernames());
    }

    socket.on("request", function (user, track) {
        requests.push({username: user.username, request: track.uri});
        chat.spotifyRequest(user, track);
    });

    setInterval(updateProgress, 2000);

    process.on("SIGINT", function () {
        logger.info( "\nShutting down!" );

        spotify.logout();
        spotify.once("logout", function (err) {
            logger.info("Spotify logged out!\n***EXIT***", err);
            throw (0);
        });
    });
};

