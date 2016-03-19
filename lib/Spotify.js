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
        this.throttle = null;
        this.country = "GB";

        // for progress
        this.lastChunkLength = 0;
        this.trackBytesTotal = 1;
        this.trackBytesCurrent = 0;

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
        this.userDao.broadcast("progress",  this.trackBytesCurrent / this.trackBytesTotal);
    }

    doPlayTrack(spTrack) {
        this.logger.info("Spotify", "do play track");

        // create a new throttle for the new track
        this.throttle = new Throttle((160 / 8) * 1024); // 160 kilo bits per second
        this.throttle.setMaxListeners(0); // don't restrict the number of clients listening

        // start a new track when it runs out of data delay for two seconds
        // before saying it's finished to try to keep clients in sync
        this.throttle.on("finish", () => {
            // w've finished so update the progess bar to the end
            this.trackBytesCurrent = this.trackBytesTotal;
            this.updatePosition();

            setTimeout(() => {
                // actaully process the end of the track
                this.reset();
                this.emit("end");
            }, 2000);
        });

        // start playing the track and write its output to the throttle
        this.currentStream = spTrack.play();
        this.currentStream.on("data", (chunk) => { this.throttle.write(chunk); });
        this.currentStream.on("end", () => { this.throttle.end(); });        

        // send data to all the connected clients and remember how much we've written
        this.throttle.on("data", (chunk) => {
            // always be a chunk behind so the progress is what
            // we've actually played not what we're going to play
            this.trackBytesCurrent += this.lastChunkLength;
            this.lastChunkLength = chunk.length;

            this.responses.forEach((res) => { res.write(chunk); });
        });
    }

    endCurrentStream() {
        // remove listeners so we don't process the finish
        // that we would when the track finishes normally
        if (this.throttle) { this.throttle.removeAllListeners(); };
        if (this.currentStream) { this.currentStream.end(); };
        this.reset();
    }

    reset() {
        this.throttle = null;
        this.trackBytesCurrent = 0;
        this.lastChunkLength = 0;
        this.updatePosition();
    }

    isLoggedIn() {
        return this.sp !== null;
    };

    isPlaying() {
        return this.throttle !== null;
    }

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

        // calculate the total bytes in this track of progress purposes
        this.trackBytesTotal = track.duration * 20; // 160 Kbps (160 / 8 = 20)

        // add a timestamp to the track for scrobbling purposes
        track.timestamp = new Date().getTime();
    }

    playTrack(spotifyUri, requester, handlers, optionalTrack) {
        this.logger.info("Spotify", "play spotify uri:", spotifyUri);

        this.endCurrentStream();

        this.sp.get(spotifyUri, (err, spTrack) => {
            if (err) {
                handlers.error({message: `couldn't get spotify track for ${spotifyUri}`});
            } else {
                if (this.sp.isTrackAvailable(spTrack, this.country)) {
                    // track is available to just play it
                    this.playResolvedTrack(spotifyUri, spTrack, requester, handlers, optionalTrack);
                } else {
                    this.logger.info("Spotify", `Not available in ${this.country} - ${spTrack.artist[0].name} ${spTrack.name}. Finding alternatives...`);
                    this.sp.recurseAlternatives(spTrack, this.country, (err, alternativeTrack) => {
                        if (err) {
                            handlers.error({message: `not available and no alternatives in ${this.country} for ${spotifyUri}`});
                        } else {
                            this.logger.info("Spotify", "Alternative found - ${spTrack.artist[0].name} ${spTrack.name}");
                            this.playTrack(alternativeTrack.uri, requester, handlers, optionalTrack);
                        }
                    });
                }
            }
        });
    };
};
