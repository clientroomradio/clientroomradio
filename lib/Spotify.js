"use strict";

module.exports = function(config, logger) {
    var that = this;

    var server = null;
    var http = require("http");
    var Spotify = require("spotify-web");
    var spotify = null;

    Spotify.login(config.spotify_username, config.spotify_password, function (err, sp) {
        logger.info("logged in", err);

        if (err) {
            throw err;
        }

        spotify = sp;

        that.emit("login");
    });

    function doPlayTrack(spTrack, track, handlers) {
        logger.info("Spotify track to play", spTrack.artist[0].name, spTrack.name);

        try {
            server.close();
        } catch (ex) {
            logger.error("there was an error closing the server", ex.message);
        }

        var port = 4000 + Math.round(Math.random() * 1000);

        server = http.createServer(function (req, res) {
            logger.info("VLC connected to internal spotify proxy server.");
            res.writeHead(200, {
                "Transfer-Encoding": "chunked",
                "Content-Disposition": "filename=\"sometrack.mp3\"",
                "Content-Length": (spTrack.duration * 192) / 8,
                "Content-Type": "audio/mpeg" });
            spTrack.play().pipe(res);
        }).listen(port);

        handlers.success(track, port);
    }

    that.isLoggedIn = function() {
        return spotify !== null;
    };

    that.playTrack = function (spotifyUri, requester, handlers, optionalTrack) {
        logger.info("play spotify uri:", spotifyUri);

        spotify.get(spotifyUri, function (err, spTrack) {
            if (err) {
                logger.error("couldn't find track", spotifyUri, err);
            } else {
                logger.info("got sp track", spTrack);

                var track = {};
                track.identifier = spotifyUri;
                track.artists = (typeof optionalTrack === "undefined") ? [ { "name": spTrack.artist[0].name } ] : optionalTrack.artists;
                track.name = (typeof optionalTrack === "undefined") ? spTrack.name : optionalTrack.name;
                track.duration = String(Math.round(spTrack.duration / 1000));
                track.extension = {
                    "requester": requester,
                    // Make up the Last.fm links
                    "artistpage": "http://www.last.fm/music/" + encodeURIComponent(track.artists),
                    "trackpage": "http://www.last.fm/music/" + encodeURIComponent(track.artists) + "/_/" + encodeURIComponent(track.name)
                };


                doPlayTrack(spTrack, track, handlers);
            }
        });
    };
};

require("util").inherits(module.exports, require("events").EventEmitter);
