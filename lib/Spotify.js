"use strict";

var COUNTRY = "GB";

module.exports = class Spotify extends require("events").EventEmitter {
  constructor(config, logger, spotifyWeb) {
    super();

    this.config = config;
    this.logger = logger;

    this.sp = null;

    // this is so we can mock the api in tests
    this.spotifyWeb = spotifyWeb || require("spotify-web");
  }

  login() {
    this.spotifyWeb.login(
      this.config.spotify.username,
      this.config.spotify.password,
      (err, sp) => {
        this.logger.info("logged in", err);
        if (!err) {
          this.sp = sp;
        }
        this.emit("login", err);
      });
  }

  // A Spotify URI could be http or uri
  // eg https://play.spotify.com/track/99999999
  // or spotify:track:99999999
  // this regex matcher just gets the id on the end
  getTrackIdFromURI(uri) {
    return /[:/]([a-zA-Z0-9]+)$/.exec(uri)[1];
  }

  isLoggedIn() {
    return this.sp !== null;
  }

  createTrack(uri, spTrack, playlistTrack) {
    var track = {};
    track.identifier = this.getTrackIdFromURI(uri);
    track.artists = (typeof playlistTrack === "undefined") ?
      [{name: spTrack.artist[0].name}] :
      playlistTrack.artists;
    track.name = (typeof playlistTrack === "undefined") ?
      spTrack.name :
      playlistTrack.name;
    track.duration = spTrack.duration;

    this.doPlayTrack(spTrack, track);
  }

  getStream(uri, playlistTrack, handlers) {
    if (uri.indexOf("/track/") !== -1 || uri.indexOf(":track:") !== -1) {
      this.logger.info(`play spotify uri: ${uri}`);

      this.endCurrentStream(() => {
        // the current track has ended!
        this.sp.get(uri, (err, spTrack) => {
          if (err) {
            handlers.error({message: `couldn't get spotify track for ${uri}`});
          } else if (this.sp.isTrackAvailable(spTrack, COUNTRY)) {
            // track is available so just play it
            var track = this.createTrack(uri, spTrack, playlistTrack);
            handlers.success(spTrack.play(), track, 20);
          } else {
            this.logger.info(`Not available in ${COUNTRY} - ${spTrack.artist[0].name} ${spTrack.name}. Finding alternatives...`);
            this.sp.recurseAlternatives(spTrack, COUNTRY, (err, alternativeTrack) => {
              if (err) {
                handlers.error({message: `not available and no alternatives in ${COUNTRY} for ${uri}`});
              } else {
                this.logger.info(`Alternative found - ${spTrack.artist[0].name} ${spTrack.name}`);
                this.getStream(alternativeTrack.uri, handlers, playlistTrack);
              }
            });
          }
        });
      });
    } else {
      handlers.error({message: `Not a Spotify URI - ${uri}`});
    }
  }
};
