"use strict";

module.exports = class Backend {
    constructor(userDao, currentTrackManager, lastfmClient, spotify, skipManager, socket, chat, logger) {
        this.userDao = userDao;
        this.currentTrackManager = currentTrackManager;
        this.lastfmClient = lastfmClient;
        this.spotify = spotify;
        this.skipManager = skipManager;
        this.socket = socket;
        this.chat = chat;
        this.logger = logger;

        this. tracks = [];
        this.requests = [];
        this.currentStationUrl = "";

        this.vlc = require("vlc")([
            "-I", "dummy",
            "-V", "dummy",
            "--verbose", "1",
            "--sout=#http{dst=:8080/stream.mp3}"
        ]);

        this.vlc.mediaplayer.on("EndReached", () => this.onEndTrack());

        skipManager.on("change", (newSkippers) => {
            logger.info("skippers shanged", newSkippers);

            var radioUsernames = userDao.getRadioUsernames();

            if ( Object.keys(radioUsernames).length > 0
                    && newSkippers.length > 0
                    && newSkippers.length >= Math.ceil(Object.keys(radioUsernames).length / 2) ) {
                chat.skipSuccessful(newSkippers);
                this.onEndTrack();
            }
        });

        userDao.on("startRadio", (radioUsers) => {
            this.startRadio(radioUsers);
        });

        if (Object.keys(userDao.getRadioUsernames()).length > 0) {
            this.startRadio(userDao.getRadioUsernames());
        }

        socket.on("request", (user, track) => {
            this.requests.push({username: user.username, request: track.uri});
            chat.spotifyRequest(user, track);
        });

        setInterval(() => this.updateProgress(), 2000);

        spotify.on("login", () => {
            this.startRadio(userDao.getRadioUsernames());
        });
    }

    onGotContext(track) {
        var activeUserCount = this.userDao.getRadioUsernames().length;
        var trackContextCount = Object.keys(track.context).length;

        if (activeUserCount > 1 && activeUserCount === trackContextCount) {
            // it's a bingo!
            track.bingo = true;
        }

        this.currentTrackManager.setCurrentTrack(track);
    }

    playTrack() {
        this.skipManager.clear();

        var handlers = {
            success: (track, port) => {
                var media = this.vlc.mediaFromUrl("http://localhost:" + port);
                media.parseSync();
                this.vlc.mediaplayer.media = media;
                this.vlc.mediaplayer.play();

                // add a timestamp to the track as we start it
                track.timestamp = new Date().getTime();

                this.lastfmClient.updateNowPlaying(track, this.userDao.getScrobbleUsers());
                this.lastfmClient.getContext(track, this.userDao.getUsernames(), (contextTrack) => this.onGotContext(contextTrack));
            },
            error: error => {
                this.logger.error("playTrack", error.message);
                this.onEndTrack();
            }
        };

        var nextTrack = this.tracks.shift();

        if (nextTrack.hasOwnProperty("request")) {
            this.spotify.playTrack(nextTrack.request, nextTrack.username, handlers);
        } else {
            // find the spotify links
            var spotifyPlayLinks = nextTrack.playlinks.filter(function (playlink) {
                return playlink.affiliate === "spotify";
            });

            if (spotifyPlayLinks.length > 0) {
                // there is at least 1 spotify play link so use the first one!
                this.spotify.playTrack("spotify:track:" + spotifyPlayLinks[0].id, undefined, handlers, nextTrack);
            } else {
                // There were no spotify tracks so go to the next track
                this.logger.info("There was no spotify link for", nextTrack);
                this.onEndTrack();
            }
        }
    }

    onEndTrack() {
        this.logger.info("onEndTrack");

        var currentTrack = this.currentTrackManager.getCurrentTrack();

        this.lastfmClient.scrobble(currentTrack, this.userDao.getScrobbleUsers(), this.skipManager.getSkippers());

        // clear the current track before doing anything else
        this.currentTrackManager.setCurrentTrack({});

        var radioUsernames = this.userDao.getRadioUsernames();

        if (Object.keys(radioUsernames).length > 0) {
            // there are some users so play next track
            if (this.requests.length > 0) {
                // there's a request, so cue it and play now
                this.tracks.unshift(this.requests.shift());
                this.playTrack();
            } else {
                // there are no requests so continue playing the radio
                var stationUrl = this.lastfmClient.getStationUrl(radioUsernames, false);

                this.logger.info("check Radio", stationUrl);

                if (this.currentStationUrl !== stationUrl) {
                    // The station is different so clear tracks and retune
                    this.tracks = [];
                    this.lastfmClient.getPlaylist(radioUsernames, (lfm) => this.onRadioGotPlaylist(lfm));
                    this.currentStationUrl = stationUrl;
                } else {
                    // the station is the same
                    if (this.tracks.length > 0) {
                        // there are more tracks to play so continue playing them
                        this.playTrack();
                    } else {
                        // fetch a new playlist
                        this.lastfmClient.getPlaylist(radioUsernames, (lfm) => this.onRadioGotPlaylist(lfm));
                    }
                }
            }
        }
    }

    onRadioGotPlaylist(lfm) {
        this.logger.info("onRadioGotPlaylist", lfm.playlist.length);
        this.tracks = lfm.playlist;
        this.onEndTrack();
    }

    updateProgress() {
        var currentTrack = this.currentTrackManager.getCurrentTrack();
        var actualPosition = (this.vlc.mediaplayer.position * this.vlc.mediaplayer.length) / currentTrack.duration;
        this.userDao.broadcast("progress", actualPosition);
    }

    startRadio(radioUsernames) {
        this.logger.info("start radio", radioUsernames);

        if (this.spotify.isLoggedIn() && !this.vlc.mediaplayer.is_playing && radioUsernames.length > 0) {
            this.currentStationUrl = this.lastfmClient.getStationUrl(radioUsernames, false);
            this.lastfmClient.getPlaylist(radioUsernames, (lfm) => this.onRadioGotPlaylist(lfm));
        }
    }
};

