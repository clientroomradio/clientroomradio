module.exports = function(winston) {
    var that = this;

    var server = null;
    var bitrate = 128;
    var http = require('http');
    var lame = require('lame');
    var lameEncoder = new lame.Encoder({"-b": bitrate});
    var crypto = require("crypto");
    var fs = require("fs");
    var sp = require('libspotify');
    var spSession;
    var spPlayer;
    var spotifyEnabled = fs.existsSync(__dirname + '/../spotify/spotify_appkey.key');

    function init() {
        if (spotifyEnabled) {
            spSession = new sp.Session({
                cache_location: __dirname + "/../spotify/cache/",
                settings_location: __dirname + "/../spotify/settings/",
                applicationKey: __dirname + '/../spotify/spotify_appkey.key'
            });
        } else {
            winston.info('No Spotify app key found: ' + __dirname + '/../spotify/spotify_appkey.key');
        }

        return spotifyEnabled;
    }

    that.login = function(username, password) {
        if (init()) {
            spSession.login(username, password, true);
            spSession.once('login', onLogin);
        }
    }

    that.relogin = function() {
        if (init()) {
            spSession.relogin();
            spSession.once('login', onLogin);
        }
    }

    function onLogin(err) {
        if (err) winston.info("Spotify login failed:", err);
        else {
            winston.info("Spotify login success!");

            spPlayer = spSession.getPlayer();
            spPlayer.pipe(lameEncoder);
        }

        that.emit('login', err);
    }

    that.logout = function() {
        if (spotifyEnabled) {
            spSession.logout();
            spSession.once('logout', onLogout);
        } else {
            that.emit('logout', {message: 'Spotify not enabled.'});
        }
    }

    function onLogout(err) {
        if (err) winston.info("Spotify logout failed:", err);
        else {
            winston.info("Spotify logout success!");
            spSession.close();
        }
        
        that.emit('logout', err);
    }

    that.search = function(track, handlers) {
        var term = 'artist:"' + track.creator + '" track:"' + track.title + '"';
        winston.info("Search term: " + term);

        var search = new sp.Search(term);
        search.trackCount = 1; // we're only interested in the first result;
        search.execute();
        search.once('ready', function() {
            if(!search.tracks.length) {
                console.error('Couldn\'t find on Spotify.');
                handlers.error();
            } else {
                playTrack(search.tracks[0], track, handlers);
            }
        });
    }

    that.request = function(crrRequest, handlers) {
        winston.info("crrRequest:", crrRequest);

        var spTrack = sp.Track.getFromUrl(crrRequest.request);

        spTrack.once('ready', function () {
            winston.info("Found:", spTrack.artist.name, spTrack.title, spTrack.availability);

            track = {};
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
    }

    function playTrack(spTrack, track, handlers) {
        if (server) {
            server.close();
        }

        var available = spTrack.availability != 'UNAVAILABLE';

        if (available) {
            spPlayer.load(spTrack);
            spPlayer.play();

            var port = 4000 + Math.round(Math.random() * 1000);

            server = http.createServer(function (req, res) {
                winston.info('CONNECTED');
                res.writeHead(200, {
                    'Transfer-Encoding': 'chunked',
                    'Content-Disposition': 'filename="sometrack.mp3"',
                    'Content-Length': (spTrack.duration * bitrate) / 8,
                    'Content-Type': 'audio/mpeg' });
                lameEncoder.pipe(res);
            }).listen(port);

            handlers.success(track, port);
        } else {
            handlers.error();
        }
    }
}

require('util').inherits(module.exports, require("events").EventEmitter);
