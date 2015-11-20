"use strict";

module.exports = function(winston) {
    var that = this;

    var server = null;
    var path = require("path");
    var http = require("http");
    var lame = require("lame");
    var lameEncoder = new lame.Encoder();
    var fs = require("fs");
    var sp = require("libspotify");
    var spSession;
    var spPlayer;
    var spotifyEnabled = fs.existsSync(path.join(__dirname, "../spotify/spotify_appkey.key"));

    function init() {
        if (spotifyEnabled) {
            spSession = new sp.Session({
                cache_location: path.join(__dirname, "../spotify/cache"),
                settings_location: path.join(__dirname, "../spotify/settings"),
                applicationKey: path.join(__dirname, "../spotify/spotify_appkey.key")
            });
        } else {
            winston.error("No Spotify app key found", path.join(__dirname, "../spotify/spotify_appkey.key"));
        }

        return spotifyEnabled;
    }

    function onLogin(err) {
        if (err) {
            winston.error("spotify.onLogin", err);
        } else {
            winston.info("Spotify login success!");

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
            winston.error("spotify.onLogout", err);
        } else {
            winston.info("Spotify logout success!");
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
        winston.info("Spotify track to play", spTrack.artist.name, spTrack.title, spTrack.availability);

        try {
            server.close();
        } catch (ex) {
            winston.error("there was an error closing the server", ex.message);
        }

        if (spTrack.availability !== "UNAVAILABLE") {
            spPlayer.load(spTrack);

            var port = 4000 + Math.round(Math.random() * 1000);

            server = http.createServer(function (req, res) {
                winston.info("VLC connected to internal spotify proxy server.");
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

    that.playTrack = function (spotifyUrl, handlers) {
        winston.info("crrRequest:", spotifyUrl);

        var spTrack = sp.Track.getFromUrl(spotifyUrl);

        spTrack.once("ready", function () {
            var track = {};
            track.identifier = spotifyUrl;
            track.artists = [ { "name": spTrack.artist.name } ];
            track.name = spTrack.title;
            track.duration = String(spTrack.duration / 1000);
            track.extension = {};

            // Make up the Last.fm links
            track.extension.artistpage = "http://www.last.fm/music/" + encodeURIComponent(spTrack.artist.name);
            track.extension.trackpage = "http://www.last.fm/music/" + encodeURIComponent(spTrack.artist.name) + "/_/" + encodeURIComponent(spTrack.title);

            doPlayTrack(spTrack, track, handlers);
        });

    };
};

require("util").inherits(module.exports, require("events").EventEmitter);
