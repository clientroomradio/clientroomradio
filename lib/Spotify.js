"use strict";

var events = require("events");
var http = require("http");
var spotifyWeb = require("spotify-web");

module.exports = class Spotify extends events.EventEmitter {
    constructor(config, logger) {
        super();

        this.config = config;
        this.logger = logger;

        this.server = null;
        this.spotify = null;

        spotifyWeb.login(config.spotify.username, config.spotify.password, (err, sp) => {
            logger.info("logged in", err);

            if (err) {
                throw err;
            }

            this.spotify = sp;

            this.emit("login");
        });
    }

    doPlayTrack(spTrack, track, handlers) {
        this.logger.info("Spotify track to play", spTrack.artist[0].name, spTrack.name);

        try {
            this.server.close();
        } catch (ex) {
            this.logger.error("there was an error closing the server", ex.message);
        }

        var port = 4000 + Math.round(Math.random() * 1000);

        this.server = http.createServer((req, res) => {
            this.logger.info("VLC connected to internal spotify proxy server.");
            res.writeHead(200, {
                "Transfer-Encoding": "chunked",
                "Content-Disposition": "filename=\"sometrack.mp3\"",
                "Content-Length": (spTrack.duration * 192) / 8,
                "Content-Type": "audio/mpeg" });
            spTrack.play().pipe(res);
        }).listen(port);

        handlers.success(track, port);
    }

    isLoggedIn() {
        return this.spotify !== null;
    };

    playTrack(spotifyUri, requester, handlers, optionalTrack) {
        this.logger.info("play spotify uri:", spotifyUri);

        this.spotify.get(spotifyUri, (err, spTrack) => {
            if (err) {
                handlers.error({message: `couldn't get spotify track for ${spotifyUri}`});
            } else {
                if (this.spotify.isTrackAvailable(spTrack, "GB")) {
                    var track = {};
                    track.identifier = spotifyUri;
                    track.artists = (typeof optionalTrack === "undefined") ? [ { "name": spTrack.artist[0].name } ] : optionalTrack.artists;
                    track.name = (typeof optionalTrack === "undefined") ? spTrack.name : optionalTrack.name;
                    track.duration = String(Math.round(spTrack.duration / 1000));
                    track.extension = {
                        "requester": requester,
                        // Make up the Last.fm links
                        "artistpage": `http://www.last.fm/music/${encodeURIComponent(track.artists)}`,
                        "trackpage": `http://www.last.fm/music/${encodeURIComponent(track.artists)}/_/${encodeURIComponent(track.name)}`
                    };


                    this.doPlayTrack(spTrack, track, handlers);
                } else {
                    handlers.error({message: `Spotify track not available in GB ${spotifyUri}`});
                }
            }
        });
    };
};
