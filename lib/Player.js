"use strict";

var Throttle = require("throttle");
var express = require("express");

module.exports = class Player extends require("events").EventEmitter {
  constructor(userDao, skipManager, config, logger, dataStore, audioService) {
    super();

    this.dataStore = dataStore;
    this.userDao = userDao;
    this.skipManager = skipManager;
    this.config = config;
    this.logger = logger;
    this.audioService = audioService;

    this.endStreamTimeout = null;
    this.throttle = null;

    // for progress
    this.trackBytesTotal = 1;
    this.trackBytesCurrent = 0;
    this.responses = [];

    this.playedTracks = dataStore.read("playedTracks") || [];
    this.dataStore.record(this, "playedTracks", "playedTracks");

    this.audioService.on('login', () => {
      this.startRadio(userDao.getRadioUsernames());
    });

    this.app = express();
    this.app.get("/stream.mp3", (req, res) => {
      this.logger.info("client connected to internal youtube server.");

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

    // when a skip happens end the current stream and then emit the end
    this.skipManager.on("skip", () =>
      this.endCurrentStream(() =>
        this.emit("end")));

    setInterval(() => this.updatePosition(), 2000);
  }

  login() {
    this.audioService.login();
  }

  close() {
    this.server.close();
  }

  updatePosition() {
    this.userDao.broadcast("progress", this.trackBytesCurrent / this.trackBytesTotal);
  }

  playStream(stream, bitRateMultiplier) {
    // create a new throttle for the new track
    this.throttle = new Throttle(bitRateMultiplier * 1000);
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
    this.currentStream = stream;
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

  isPlayedTrack(uri) {
    // make sure we prune the played list before we check
    this.prunePlayedTracks();

    return this.playedTracks.findIndex(playedTrack => {
      return playedTrack.id === this.audioService.getTrackIdFromURI(uri);
    }) !== -1;
  }

  addPlayedTrack(track) {
    this.playedTracks.push({
      id: track.identifier,
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
    return this.audioService.isLoggedIn();
  }

  isPlaying() {
    return this.throttle !== null;
  }

  playTrack(uri, requester, handlers, playlistTrack) {
    if (requester === undefined && this.isPlayedTrack(uri)) {
      handlers.error({message: `Already played - ${uri}`});
    } else {
      this.audioService.getStream(
        uri,
        playlistTrack,
        {
          success: (stream, track, bitRateMultiplier) => {
            // add some common things to the track
            track.extension = {
              requester: requester,
              // Make up the Last.fm links
              artistpage: `http://www.last.fm/music/${encodeURIComponent(track.artists[0].name)}`,
              trackpage: `http://www.last.fm/music/${encodeURIComponent(track.artists[0].name)}/_/${encodeURIComponent(track.name)}`
            };

            // add a timestamp to the track for scrobbling
            track.timestamp = new Date().getTime();

            this.trackBytesTotal = track.duration * bitRateMultiplier;

            this.addPlayedTrack(track);
            this.playStream(stream, bitRateMultiplier);
            handlers.success(track);
          },
          error: handlers.error
        }
      );
    }
  }
};
