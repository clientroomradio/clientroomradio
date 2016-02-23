"use strict";

module.exports = function(logger) {
    var that = this;

    var server = null;
    var http = require("http");
    var lame = require("lame");
    var lameEncoder = new lame.Encoder();
    var fs = require("fs");
    var sp = require("libspotify");
    var spSession;
    var spPlayer;
    var spotifyAppKeyFilename = "/etc/crr/spotify_appkey.key";
    var spotifyEnabled = fs.existsSync(spotifyAppKeyFilename);

    function init() {
        if (spotifyEnabled) {
            spSession = new sp.Session({
                "cache_location": "/var/crr/spotify/cache",
                "settings_location": "/var/crr/spotify/settings",
                "applicationKey": spotifyAppKeyFilename
            });
        } else {
            logger.error("No Spotify app key found", spotifyAppKeyFilename);
        }

        return spotifyEnabled;
    }

    function onLogin(err) {
        if (err) {
            logger.error("spotify.onLogin", err);
        } else {
            logger.info("Spotify login success!");

            spPlayer = spSession.getPlayer();
            spPlayer.pipe(lameEncoder);
        }

        that.emit("login", err);
    }

    that.login = function(username, password) {
        if (init()) {
            spSession.login(username, password, true);
            spSession.once("login", onLogin);
        }
    };

    that.relogin = function() {
        if (init()) {
            spSession.relogin();
            spSession.once("login", onLogin);
        }
    };

    function onLogout(err) {
        if (err) {
            logger.error("spotify.onLogout", err);
        } else {
            logger.info("Spotify logout success!");
            spSession.close();
        }

        that.emit("logout", err);
    }

    that.logout = function() {
        if (spotifyEnabled) {
            spSession.logout();
            spSession.once("logout", onLogout);
        } else {
            that.emit("logout", {message: "Spotify not enabled."});
        }
    };

    function doPlayTrack(spTrack, track, handlers) {
        logger.info("Spotify track to play", spTrack.artist.name, spTrack.title, spTrack.availability);

        try {
            server.close();
        } catch (ex) {
            logger.error("there was an error closing the server", ex.message);
        }

        if (spTrack.availability !== "UNAVAILABLE") {
            spPlayer.load(spTrack);

            var port = 4000 + Math.round(Math.random() * 1000);

            server = http.createServer(function (req, res) {
                logger.info("VLC connected to internal spotify proxy server.");
                res.writeHead(200, {
                    "Transfer-Encoding": "chunked",
                    "Content-Disposition": "filename=\"sometrack.mp3\"",
                    "Content-Length": (spTrack.duration * 128) / 8,
                    "Content-Type": "audio/mpeg" });
                lameEncoder.pipe(res);
                spPlayer.play();
            }).listen(port);

            handlers.success(track, port);
        } else {
            handlers.error({message: spTrack.availability});
        }
    }

    that.playTrack = function (spotifyUrl, requester, handlers, optionalTrack) {
        logger.info("crrRequest:", spotifyUrl);

        var spTrack = sp.Track.getFromUrl(spotifyUrl);

        spTrack.once("ready", function () {
            var track = {};
            track.identifier = spotifyUrl;
            track.artists = (typeof optionalTrack === "undefined") ? [ { "name": spTrack.artist.name } ] : optionalTrack.artists;
            track.name = (typeof optionalTrack === "undefined") ? spTrack.title : optionalTrack.name;
            track.duration = String(spTrack.duration / 1000);
            track.extension = {
                "requester": requester,
                // Make up the Last.fm links
                "artistpage": "http://www.last.fm/music/" + encodeURIComponent(spTrack.artist.name),
                "trackpage": "http://www.last.fm/music/" + encodeURIComponent(spTrack.artist.name) + "/_/" + encodeURIComponent(spTrack.title)
            };


            doPlayTrack(spTrack, track, handlers);
        });

    };
};

require("util").inherits(module.exports, require("events").EventEmitter);
