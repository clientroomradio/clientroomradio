module.exports = function(winston) {
    var that = this;

    var requests = [];
    var lame = require('lame');
    var lameEncoder = new lame.Encoder();
    var crypto = require("crypto");
    var fs = require("fs");
    var sp = require('libspotify');
    var spSession;
    var spPlayer;

    function init() {
        if ( fs.existsSync(__dirname + '/../spotify/spotify_appkey.key') ) {
            spSession = new sp.Session({
                cache_location: __dirname + "/../spotify/cache/",
                settings_location: __dirname + "/../spotify/settings/",
                applicationKey: __dirname + '/../spotify/spotify_appkey.key'
            });
        }
    }

    that.login = function(username, password) {
        init();
        spSession.login(username, password, true);
        spSession.once('login', onLogin);
    }

    that.relogin = function() {
        init();
        spSession.relogin();
        spSession.once('login', onLogin);
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
        spSession.logout();
        spSession.once('logout', onLogout);
    }

    function onLogout(err) {
        if (err) winston.info("Spotify logout failed:", err);
        else {
            winston.info("Spotify logout success!");
            spSession.close();
        }
        
        that.emit('logout', err);
    }

    function finished() {
        var request = requests.shift();
        winston.info("We've finished downloading a Spotify track.");
        // remove the request now that we've finished downloading it
        that.emit('downloadedTrack', request.track);

        if (requests.length > 0) {
            downloadTrack(requests[0]);
        }
    }

    function onDownloadedTrack() {
        winston.info('Spotify track finished downloading.');
        this.close();
        finished();
    }

    function onObjectReady() {
        var request = this;

        winston.info("Found:", request.spTrack.artist.name, request.spTrack.title, request.spTrack.availability);

        var available = request.spTrack.availability != 'UNAVAILABLE';

        requests.push(request);

        if ( requests.length == 1 && available) {
            // we're not already downloading, so start now
            downloadTrack(requests[0]);
        }
    }

    that.request = function(crrRequest) {
        winston.info("crrRequest:", crrRequest);

        var spTrack = sp.Track.getFromUrl(crrRequest.request);
        var request = {
            "track": {
                "identifier": crrRequest.request,
                "requester": crrRequest.username
            },
            "spTrack": spTrack
        }
        spTrack.once('ready', (onObjectReady).bind(request) );
    }

    function downloadTrack(request) {
    	winston.info("Download Spotify track!");

        request.track.creator = request.spTrack.artist.name;
        request.track.album = request.spTrack.album.name;
        request.track.title = request.spTrack.title;
        request.track.duration = String(request.spTrack.duration);

    	var hash = crypto.createHash("md5").update(request.track.creator + request.track.title).digest("hex");
        var mp3location = __dirname + '/../spotify/tracks/' + hash + '.mp3';
        request.track.location = mp3location;
        request.track.extension = {};
        
        // Make up the Last.fm links
        request.track.extension.artistpage = "http://www.last.fm/music/" + encodeURIComponent(request.spTrack.artist.name);
        request.track.extension.trackpage = "http://www.last.fm/music/" + encodeURIComponent(request.spTrack.artist.name) + "/_/" + encodeURIComponent(request.spTrack.title);

        if (fs.existsSync(mp3location)) {
            winston.info("We already have this file so just use that");
            finished();
        }
        else {
            winston.info("start downloading the track");
            spPlayer.load(request.spTrack);
            spPlayer.play();

            // get the Spotify track, encode as mp3, and save to file
            var fileWS = fs.createWriteStream(mp3location);
            lameEncoder.pipe(fileWS);
            spPlayer.once('track-end', (onDownloadedTrack).bind(fileWS) );
        }
    }
}

require('util').inherits(module.exports, require("events").EventEmitter);
