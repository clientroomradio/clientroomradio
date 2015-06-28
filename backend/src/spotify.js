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
    var spotifyEnabled = fs.existsSync(path.join(__dirname, "/../spotify/spotify_appkey.key"));

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

    function playTrack(spTrack, track, handlers) {
        winston.info("Spotify track to play", spTrack.artist.name, spTrack.title, spTrack.availability);

        if (server) {
            server.close();
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

    that.search = function(track, handlers) {
        var term = "artist:\"" + track.creator + "\" track:\"" + track.title + "\"";
        winston.info("Search term: " + term);

        var search = new sp.Search(term);
        search.trackCount = 1; // we're only interested in the first result;
        search.execute();
        search.once("ready", function() {
            if(!search.tracks.length) {
                handlers.error({message: "Couldn't find on Spotify."});
            } else {
                // use the duration of the actual Spotify track
                // not the duration Last.fm thinks it is
                track.duration = String(search.tracks[0].duration);
                playTrack(search.tracks[0], track, handlers);
            }
        });
    };

    that.request = function(crrRequest, handlers) {
        winston.info("crrRequest:", crrRequest);

        var spTrack = sp.Track.getFromUrl(crrRequest.request);

        spTrack.once("ready", function () {
            var track = {};
            track.identifier = crrRequest.request;
            track.requester = crrRequest.username;
            track.creator = spTrack.artist.name;
            track.album = spTrack.album.name;
            track.title = spTrack.title;
            track.duration = String(spTrack.duration);
            track.extension = {};

            // Make up the Last.fm links
            track.extension.artistpage = "http://www.last.fm/music/" + encodeURIComponent(spTrack.artist.name);
            track.extension.trackpage = "http://www.last.fm/music/" + encodeURIComponent(spTrack.artist.name) + "/_/" + encodeURIComponent(spTrack.title);

            playTrack(spTrack, track, handlers);
        });
    };
};

require("util").inherits(module.exports, require("events").EventEmitter);
