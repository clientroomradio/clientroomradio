"use strict";

var Throttle = require("throttle");
var express = require("express");

module.exports = class Spotify extends require("events").EventEmitter {
    constructor(userDao, config, logger, spotifyWeb) {
        super();

        // this is so we can mock the api in tests
        this.spotifyWeb = spotifyWeb || require("spotify-web");

        this.userDao = userDao;
        this.config = config;
        this.logger = logger;

        this.sp = null;
        this.timestamp = 0;
        this.duration = 0;
        this.country = "GB";

        // throttle is in bytes per second
        this.throttle = new Throttle((160 / 8) * 1024);

        this.responses = [];

        this.app = express();
        this.app.get("/stream.mp3", (req, res) => {
            this.logger.info("Spotify", "client connected to internal spotify server.");

            // we need to tell the client that it's a chunked stream at least
            res.writeHead(200, {
                "Transfer-Encoding": "chunked",
                "Content-Disposition": "filename=\"sometrack.mp3\"",
                "Content-Type": "audio/mpeg" });

            this.responses.push(res);

            // remove responses when the client hangs up
            var removeDisconnected = () => { this.responses.splice(this.responses.indexOf(res), 1); };
            req.on("close", () => { removeDisconnected(); });
            req.on("end", () => { removeDisconnected(); });

            // pipe existing track to new client and don't end the response when the track finishes
            this.throttle.pipe(res, { end: false });
        });
        
        this.server = this.app.listen(8080);

        this.spotifyWeb.login(config.spotify.username, config.spotify.password, (err, sp) => {
            logger.info("logged in", err);
            if (!err) { this.sp = sp; }
            this.emit("login", err);
        });

        setInterval(() => this.updatePosition(), 2000);
    }

    close() {
        this.server.close();
    }

    updatePosition() {
        var now = new Date().getTime();
        var position = now - this.timestamp;
        this.userDao.broadcast("progress",  position / this.duration);
    }

    doPlayTrack(spTrack) {
        this.logger.info("Spotify", "do play track");

        // stop streaming any existing track to clients
        this.responses.forEach((res) => { this.throttle.unpipe(res); });

        // create a new throttle for the new track
        this.throttle = new Throttle((160 / 8) * 1024); // 160 kilo bits per second
        this.throttle.setMaxListeners(0); // don't restrict the number of clients listening

        // start a new track when it runs out of data delay for two seconds to try to keep clients in sync
        this.throttle.on("end", () => { setTimeout(() => this.emit("end"), 2000); });

        this.currentStream = spTrack.play();
        this.currentStream.pipe(this.throttle);

        // pipe the new track to all the existing clients
        this.responses.forEach((res) => { this.throttle.pipe(res, { end: false }); });
    }

    isLoggedIn() {
        return this.sp !== null;
    };

    playResolvedTrack(spotifyUri, spTrack, requester, handlers, optionalTrack) {
        var track = {};
        track.identifier = spotifyUri;
        track.artists = (typeof optionalTrack === "undefined") ? [ { "name": spTrack.artist[0].name } ] : optionalTrack.artists;
        track.name = (typeof optionalTrack === "undefined") ? spTrack.name : optionalTrack.name;
        track.duration = spTrack.duration;
        track.extension = {
            "requester": requester,
            // Make up the Last.fm links
            "artistpage": `http://www.last.fm/music/${encodeURIComponent(track.artists[0].name)}`,
            "trackpage": `http://www.last.fm/music/${encodeURIComponent(track.artists[0].name)}/_/${encodeURIComponent(track.name)}`
        };


        this.doPlayTrack(spTrack, track);
        handlers.success(track);
        
        // remember start timestamp and duration so we can update progress
        this.timestamp = new Date().getTime();
        this.duration = track.duration;

        // add a timestamp to the track for scrobbling purposes
        track.timestamp = this.timestamp;
    }

    playTrack(spotifyUri, requester, handlers, optionalTrack) {
        this.logger.info("Spotify", "play spotify uri:", spotifyUri);

        this.sp.get(spotifyUri, (err, spTrack) => {
            if (err) {
                handlers.error({message: `couldn't get spotify track for ${spotifyUri}`});
            } else {
                if (this.sp.isTrackAvailable(spTrack, this.country)) {
                    // track is available to just play it
                    this.playResolvedTrack(spotifyUri, spTrack, requester, handlers, optionalTrack);
                } else {
                    this.logger.info("Spotify", `not available in ${this.country}. finding alternatives`);
                    this.sp.recurseAlternatives(spTrack, this.country, (err, alternativeTrack) => {
                        if (err) {
                            handlers.error({message: `not available and no alternatives in ${this.country} for ${spotifyUri}`});
                        } else {
                            this.logger.info("Spotify", "found an alternative");
                            this.playTrack(alternativeTrack.uri, requester, handlers, optionalTrack);
                        }
                    });
                }
            }
        });
    };
};
