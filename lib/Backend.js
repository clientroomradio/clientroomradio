'use strict';

module.exports = class Backend {
  constructor(userDao, currentTrackManager, lastfmClient, player, skipManager, socket, chat, logger) {
    this.userDao = userDao;
    this.currentTrackManager = currentTrackManager;
    this.lastfmClient = lastfmClient;
    this.player = player;
    this.skipManager = skipManager;
    this.socket = socket;
    this.chat = chat;
    this.logger = logger;

    this.tracks = [];
    this.requests = [];
    this.currentStationUrl = '';

    userDao.on('startRadio', radioUsers => {
      this.startRadio(radioUsers);
    });

    if (userDao.getRadioUsernames().length > 0) {
      this.startRadio(userDao.getRadioUsernames());
    }

    socket.on('request', (user, track) => {
      this.requests.push({username: user.username, request: track.uri});
      chat.spotifyRequest(user, track);
    });

    player.on('login', () => {
      this.startRadio(userDao.getRadioUsernames());
    });

    player.on('end', () => this.onEndTrack());
  }

  isBingo(radioUsernames, context) {
    // filter the context usernames by ones that are currently in the radio
    var radioListenerUsernames = Object.keys(context).filter(username => {
      return radioUsernames.indexOf(username) !== -1;
    });

    return radioUsernames.length > 1 && // must be at least one listener
           radioUsernames.length === radioListenerUsernames.length; // all radio users have listened
  }

  onGotContext(track) {
    track.bingo = this.isBingo(this.userDao.getRadioUsernames(), track.context);
    this.currentTrackManager.setCurrentTrack(track);
  }

  playTrack() {
    var handlers = {
      success: track => {
        this.lastfmClient.updateNowPlaying(track, this.userDao.getScrobbleUsers());
        this.lastfmClient.getContext(track, this.userDao.getUsernames(), contextTrack => this.onGotContext(contextTrack));
      },
      error: error => {
        this.logger.error("playTrack", error.message);
        this.onEndTrack();
      }
    };

    var nextTrack = this.tracks.shift();

    if (nextTrack.hasOwnProperty("request")) {
      this.player.playTrack(nextTrack.request, nextTrack.username, handlers);
    } else {
      // find the spotify links
      var youtubePlayLinks = nextTrack.playlinks.filter(playlink => {
        return playlink.affiliate === "youtube";
      });

      if (youtubePlayLinks.length > 0) {
        // there is at least 1 spotify play link so use the first one!
        this.player.playTrack(youtubePlayLinks[0].url, undefined, handlers, nextTrack);
      } else {
        // There were no spotify tracks so go to the next track
        this.logger.info("There was no spotify link for", nextTrack);
        this.onEndTrack();
      }
    }
  }

  onEndTrack() {
    this.logger.info("onEndTrack");

    var currentTrack = this.currentTrackManager.getCurrentTrack();

    this.lastfmClient.scrobble(currentTrack, this.userDao.getScrobbleUsers(), this.skipManager.getSkippers());

    // clear the current track before doing anything else
    this.currentTrackManager.setCurrentTrack({});

    var radioUsernames = this.userDao.getRadioUsernames();

    if (Object.keys(radioUsernames).length > 0) {
      // there are some users so play next track
      if (this.requests.length > 0) {
        // there's a request, so cue it and play now
        this.tracks.unshift(this.requests.shift());
        this.playTrack();
      } else {
        // there are no requests so continue playing the radio
        var stationUrl = this.lastfmClient.getStationUrl(radioUsernames, false);

        this.logger.info("check Radio", stationUrl);

        if (this.currentStationUrl === stationUrl) {
          // the station is the same
          if (this.tracks.length > 0) {
            // there are more tracks to play so continue playing them
            this.playTrack();
          } else {
            // fetch a new playlist
            this.lastfmClient.getPlaylist(radioUsernames, lfm => this.onRadioGotPlaylist(lfm));
          }
        } else {
          // The station is different so clear tracks and retune
          this.tracks = [];
          this.lastfmClient.getPlaylist(radioUsernames, lfm => this.onRadioGotPlaylist(lfm));
          this.currentStationUrl = stationUrl;
        }
      }
    }
  }

  onRadioGotPlaylist(lfm) {
    this.logger.info("onRadioGotPlaylist", lfm.playlist.length);
    this.tracks = lfm.playlist;
    this.onEndTrack();
  }

  startRadio(radioUsernames) {
    this.logger.info("start radio", radioUsernames);

    if (this.player.isLoggedIn() &&
        !this.player.isPlaying() &&
        radioUsernames.length > 0) {
      this.currentStationUrl = this.lastfmClient.getStationUrl(radioUsernames, false);
      this.lastfmClient.getPlaylist(radioUsernames, lfm => this.onRadioGotPlaylist(lfm));
    }
  }
};

