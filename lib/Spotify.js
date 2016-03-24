"use strict";

var Throttle = require("throttle");
var express = require("express");

module.exports = class Spotify extends require("events").EventEmitter {
  constructor(userDao, config, logger, dataStore, spotifyWeb) {
    super();

    this.dataStore = dataStore;
    this.userDao = userDao;
    this.config = config;
    this.logger = logger;

    this.endStreamTimeout = null;
    this.sp = null;
    this.throttle = null;
    this.country = "GB";

    // for progress
    this.trackBytesTotal = 1;
    this.trackBytesCurrent = 0;
    this.responses = [];

    this.playedTracks = dataStore.read("playedTracks") || [];
    this.dataStore.record(this, "playedTracks", "playedTracks");

    // this is so we can mock the api in tests
    this.spotifyWeb = spotifyWeb || require("spotify-web");

    this.app = express();
    this.app.get("/stream.mp3", (req, res) => {
      this.logger.info("client connected to internal spotify server.");

      // we need to tell the client that it's a chunked stream at least
      res.writeHead(200, {
        "Transfer-Encoding": "chunked",
        "Content-Disposition": "filename=\"sometrack.mp3\"",
        "Content-Type": "audio/mpeg"});

      this.responses.push(res);

      // remove responses when the client hangs up
      var removeDisconnected = () => this.responses.splice(this.responses.indexOf(res), 1);
      req.on("close", () => removeDisconnected());
      req.on("end", () => removeDisconnected());
    });

    this.server = this.app.listen(8080);

    this.spotifyWeb.login(config.spotify.username, config.spotify.password, (err, sp) => {
      logger.info("logged in", err);
      if (!err) {
        this.sp = sp;
      }
      this.emit("login", err);
    });

    setInterval(() => this.updatePosition(), 2000);
  }

  close() {
    this.server.close();
  }

  updatePosition() {
    this.userDao.broadcast("progress", this.trackBytesCurrent / this.trackBytesTotal);
  }

  doPlayTrack(spTrack) {
    // create a new throttle for the new track
    this.throttle = new Throttle(20 * 1000); // 160Kbps = 20 KBps
    this.throttle.setMaxListeners(0); // don't restrict the number of clients listening

    // start a new track when it runs out of data delay for two seconds
    // before saying it's finished to try to keep clients in sync
    this.throttle.on("end", () => {
      // we've finished so update the progess bar to the end
      this.trackBytesCurrent = this.trackBytesTotal;
      this.updatePosition();

      // the stream has already ended, but we call this to keep
      // the delay before starting the new track consitent
      this.endCurrentStream(() => this.emit("end"));
    });

    // start playing the track and write its output to the throttle
    this.currentStream = spTrack.play();
    this.currentStream.on("data", chunk => this.throttle.write(chunk));
    this.currentStream.on("end", () => {
      if (this.throttle) {
        this.throttle.end();
      }
    });

    // send data to all the connected clients and remember how much we've written
    this.throttle.on("data", chunk => {
      this.trackBytesCurrent += chunk.length;
      this.responses.forEach(res => res.write(chunk));
    });
  }

  prunePlayedTracks() {
    // Get rid of any played tracks more than one day old
    this.playedTracks = this.playedTracks.filter(playedTrack => {
      return playedTrack.timestamp >= new Date().getTime() - (this.config.noRepeatDays * 86400000);
    });

    this.emit("playedTracks", this.playedTracks);
  }

  // A Spotify URI could be http or uri
  // eg https://play.spotify.com/track/99999999
  // or spotify:track:99999999
  // this regex matcher just gets the id on the end
  getTrackIdFromURI(uri) {
    return /[:/]([a-zA-Z0-9]+)$/.exec(uri)[1];
  }

  getTrackIdFromPlaylistTrack(track) {
    var spotifyPlayLinks = track.playlinks.filter(playlink => {
      return playlink.affiliate === "spotify";
    });

    if (spotifyPlayLinks.length > 0) {
      return this.getTrackIdFromURI(spotifyPlayLinks[0].url);
    }

    return track.artists[0].name + track.name;
  }

  isPlayedTrack(spotifyUri) {
    // make sure we prune the played list before we check
    this.prunePlayedTracks();

    return this.playedTracks.findIndex(playedTrack => {
      return playedTrack.id === this.getTrackIdFromURI(spotifyUri);
    }) !== -1;
  }

  addPlayedTrack(track) {
    this.playedTracks.push({
      id: this.getTrackIdFromURI(track.identifier),
      timestamp: new Date().getTime()
    });

    this.emit("playedTracks", this.playedTracks);
  }

  endCurrentStream(callback) {
    // remove listeners so we don't process the finish
    // that we would when the track finishes normally
    if (this.throttle) {
      this.throttle.removeAllListeners();
      this.currentStream.end();
      this.reset();
      this.endStreamTimeout = setTimeout(() => {
        this.endStreamTimeout = null;
        callback();
      }, 2000);
    } else if (this.endStreamTimeout === null) {
      // the track has already ended and we're not already
      // waiting on a timeout so just call the callback
      callback();
    }
  }

  reset() {
    this.throttle = null;
    this.trackBytesCurrent = 0;
    this.lastChunkLength = 0;
    this.updatePosition();
  }

  isLoggedIn() {
    return this.sp !== null;
  }

  isPlaying() {
    return this.throttle !== null;
  }

  playResolvedTrack(spotifyUri, spTrack, requester, handlers, optionalTrack) {
    if (this.isPlayedTrack(spotifyUri)) {
      handlers.error({message: `Already played - ${spTrack.artist[0].name} ${spTrack.name}`});
    } else {
      var track = {};
      track.identifier = spotifyUri;
      track.artists = (typeof optionalTrack === "undefined") ? [{name: spTrack.artist[0].name}] : optionalTrack.artists;
      track.name = (typeof optionalTrack === "undefined") ? spTrack.name : optionalTrack.name;
      track.duration = spTrack.duration;
      track.extension = {
        requester: requester,
        // Make up the Last.fm links
        artistpage: `http://www.last.fm/music/${encodeURIComponent(track.artists[0].name)}`,
        trackpage: `http://www.last.fm/music/${encodeURIComponent(track.artists[0].name)}/_/${encodeURIComponent(track.name)}`
      };

      this.doPlayTrack(spTrack, track);
      handlers.success(track);

      // calculate the total bytes in this track of progress purposes
      this.trackBytesTotal = track.duration * 20; // 160 Kbps (160 / 8 = 20)

      // add a timestamp to the track for scrobbling purposes
      track.timestamp = new Date().getTime();

      // add played track so we don't play it again
      this.addPlayedTrack(track);
    }
  }

  playTrack(spotifyUri, requester, handlers, optionalTrack) {
    this.logger.info(`play spotify uri: ${spotifyUri}`);

    this.endCurrentStream(() => {
      // the current track has ended!
      this.sp.get(spotifyUri, (err, spTrack) => {
        if (err) {
          handlers.error({message: `couldn't get spotify track for ${spotifyUri}`});
        } else if (this.sp.isTrackAvailable(spTrack, this.country)) {
          // track is available so just play it
          this.playResolvedTrack(spotifyUri, spTrack, requester, handlers, optionalTrack);
        } else {
          this.logger.info(`Not available in ${this.country} - ${spTrack.artist[0].name} ${spTrack.name}. Finding alternatives...`);
          this.sp.recurseAlternatives(spTrack, this.country, (err, alternativeTrack) => {
            if (err) {
              handlers.error({message: `not available and no alternatives in ${this.country} for ${spotifyUri}`});
            } else {
              this.logger.info(`Alternative found - ${spTrack.artist[0].name} ${spTrack.name}`);
              this.playTrack(alternativeTrack.uri, requester, handlers, optionalTrack);
            }
          });
        }
      });
    });
  }
};
