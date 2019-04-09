"use strict";

var ytdl = require('ytdl-core');
var FFmpeg = require('fluent-ffmpeg');
var through = require('through2');
var Util = require('../static/js/lib/util.js');

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

      var video = ytdl(
        uri,
        {
          filter: 'audioonly'
        }
      );

      // wait for the info callback because we'd like to know the actual duration
      // of the video not what Last.fm told us it was as it's often wrong
      video.on('info', info => {
        track.duration = info.length_seconds * 1000;
        if (playlistTrack === undefined) {
          // it's a request, we only have the video title so try to split it
          var artistTrack = Util.processYoutubeVideoTitle(info.title);
          if (Util.isArtistTrackEmpty(artistTrack)) {
            // we filter for video title's that can be split in the search dialog
            // but we allow requesting of any video with `?request <youtube_video>`
            // this would be one of those with a BAD title
            track.artists = [{name: "[unknown]"}];
            track.name = info.title;
          } else {
            // we could split the title so use that
            track.artists = [{name: artistTrack.artist}];
            track.name = artistTrack.track;
          }
        } else {
          // track from Last.fm playlist, we have the details
          track.artists = playlistTrack.artists;
          track.name = playlistTrack.name;
        }

        var stream = through();

        new FFmpeg(video)
          .on("error", err => {
            handlers.error(new Error(err.message));
          })
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
