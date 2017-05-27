"use strict";

var ytdl = require('ytdl-core');
var FFmpeg = require('fluent-ffmpeg');
var through = require('through2');

module.exports = class YouTube extends require("events").EventEmitter {
  constructor(config, logger) {
    super();

    this.config = config;
    this.logger = logger;
  }

  login() {
    // we don't need to login to youtube so do nothing
  }

  isLoggedIn() {
    return true;
  }

  // A YouTube uri looks like this: https://www.youtube.com/watch?v=wYp-tE1qfsE
  // we split at "v=" and get the second part. Simples.
  getTrackIdFromURI(uri) {
    return uri.split("v=")[1];
  }

  getStream(uri, playlistTrack, handlers) {
    if (uri.includes("youtube.com")) {
      var track = {};
      track.identifier = uri;
      track.artists = playlistTrack.artists;
      track.name = playlistTrack.name;

      var video = ytdl(
        uri,
        {
          filter: format => {
            return format.container === 'mp4';
          },
          quality: 'lowest'
        }
      );

      // wait for the info callback because we'd like to know the actual duration
      // of the video not what Last.fm told us it was as it's often wrong
      video.on('info', info => {
        track.duration = info.length_seconds * 1000;

        var stream = through();

        var ffmpeg = new FFmpeg(video);
        ffmpeg
          .format('mp3')
          .audioBitrate('128')
          .pipe(stream);

        handlers.success(stream, track, 16);
      });

      // make sure we handle errors, like the video having been taken down
      // this'll just skip to the next song before anyone's noticed
      video.on('error', handlers.error);
    } else {
      handlers.error(new Error("Not a YouTube uri"));
    }
  }
};
