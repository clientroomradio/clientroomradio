"use strict";

var LastFmNode = require("lastfm").LastFmNode;
var request = require("request");
var events = require("events");

module.exports = class LastfmClient extends events.EventEmitter {
  constructor(config, logger, lastfm) {
    super();

    this.config = config;
    this.logger = logger;

    // use the past in lastfm in preference so it can be mocked in tests
    this.lastfm = lastfm || new LastFmNode({
      api_key: config.lfm.apiKey, // eslint-disable-line
      secret: config.lfm.secret,
      useragent: "clientroomradio/v0.1 Client Room Radio"
    });
  }

  login(token, callback) {
    this.logger.info("login!", token);
    this.lastfm.session({token: token}).on("success", session => {
      // Make it an "err, data"-style callback
      callback(null, session);
    }).on("error", error => {
      this.logger.error("lastfm token error", error.message, error.stack);
      callback(error, "");
    });
  }

  setLoveStatus(user, track, loveFlag, callback) {
    var method = loveFlag ? "track.love" : "track.unlove";
    this.lastfm.request(method, {
      track: track.name,
      artist: track.artists[0].name,
      sk: user.sk,
      handlers: {
        success: lfm => {
          callback(lfm, null);
        },
        error: error => {
          callback(null, error);
        }
      }
    });
  }

  userGetInfo(username, callback) {
    this.lastfm.request("user.getInfo", {
      user: username,
      handlers: {
        success: lfm => {
          callback(null, lfm);
        },
        error: error => {
          callback(error.message, "");
        }
      }
    });
  }

  doUpdateNowPlaying(user, track) {
    this.lastfm.request("track.updateNowPlaying", {
      track: track.name,
      artist: track.artists[0].name,
      duration: Math.round(track.duration / 1000),
      sk: user.sk,
      handlers: {
        success: () => {
          this.logger.info("Updated now playing for", user.username);
        },
        error: error => {
          this.logger.error("doUpdateNowPlaying", error.message);
        }
      }
    });
  }

  updateNowPlaying(track, scrobbleUsers) {
    if (Object.keys(track).length !== 0) {
      // always scrobble to clientroom
      if (typeof this.config.scrobbleToHost === "undefined" ||
          this.config.scrobbleToHost) {
        this.doUpdateNowPlaying({
          username: "clientroom",
          sk: this.config.lfm.sk
        }, track);
      }

      Object.keys(scrobbleUsers).forEach(username => {
        this.doUpdateNowPlaying(scrobbleUsers[username], track);
      });
    }
  }

  doScrobble(username, sessionKey, track) {
    var options = {
      "track[0]": track.name,
      "artist[0]": track.artists[0].name,
      "timestamp[0]": Math.round(track.timestamp / 1000),
      "duration[0]": Math.round(track.duration / 1000),
      "sk": sessionKey,
      "chosenByUser[0]": "0",
      "handlers": {
        success: lfm => {
          this.logger.info("Scrobbled track for:", username, lfm);
        },
        error: error => {
          this.logger.info("Scrobble error:" + error.message);
        }
      }
    };

    if (Object.prototype.hasOwnProperty.call(track.extension, "streamid")) {
      options["streamid[0]"] = track.extension.streamid;
    }

    this.lastfm.request("track.scrobble", options);
  }

  scrobble(track, scrobbleUsers, skippers) {
    if (Object.keys(track).length !== 0 && // This isn't a null track
        track.duration >= 30000 && // The track over 30 seconds long
        // we've listened to more than half the song
        new Date().getTime() - track.timestamp > Math.ceil(track.duration / 2)) {
      if (typeof this.config.scrobbleToHost === "undefined" || this.config.scrobbleToHost) {
        this.doScrobble("clientroom", this.config.lfm.sk, track);
      }

      Object.keys(scrobbleUsers).forEach(username => {
        if (skippers.indexOf(username) === -1) {
          // the user hasn't voted to skip this track
          this.doScrobble(username, scrobbleUsers[username].sk, track);
        }
      });
    }
  }

  trackGetAlbumArt(track) {
    this.lastfm.request("track.getInfo", {
      track: track.name,
      artist: track.artists[0].name,
      handlers: {
        success: lfm => {
          if (typeof lfm.track.album !== "undefined") {
            track.image = lfm.track.album.image[1]["#text"];
          }
        }
      }
    });
  }

  getContext(track, usernames, callback) {
    track.context = {};

    usernames.forEach(username => {
      this.lastfm.request("track.getInfo", {
        track: track.name,
        artist: track.artists[0].name,
        username: username,
        handlers: {
          success: lfm => {
            this.logger.info("getContext", username, track.name, lfm.track.userplaycount);
            if (typeof lfm.track.album !== "undefined") {
              track.image = lfm.track.album.image[2]["#text"];
            }
            if (typeof lfm.track.userplaycount !== "undefined" && lfm.track.userplaycount > 0) {
              track.context[username] = track.context[username] || {username: username};
              track.context[username].userplaycount = lfm.track.userplaycount;
              track.context[username].userloved = lfm.track.userloved;
            }
            callback(track);
          },
          error: error => {
            this.logger.error("getContext:track.getInfo", error.message);
            callback(track);
          }
        }
      });
    });
  }

  /*
  function getRqlStationUrl(sortedUsers) {
      var rqlString = "";

      for ( var user in sortedUsers ) {
          if (rqlString.length === 0) {
              rqlString = util.format("%s", "user:" + sortedUsers[user]);
          } else {
              rqlString = util.format("%s or %s", rqlString, "user:" + sortedUsers[user]);
          }
      }

      // and some tags?
      if (tags.length > 0) {
          // We have some tags so use them!
          var tagString = "";

          for (var tag in tags) {
              if (tagString.length === 0) {
                  tagString = util.format("tag:\"%s\"", tags[tag]);
              } else {
                  tagString = util.format("%s or tag:\"%s\"", tagString, tags[tag]);
              }
          }

          rqlString = util.format("(%s) and (%s)", rqlString, tagString);
      }

      return "lastfm://rql/" + new Buffer(rqlString).toString("base64");
  }
  */

  getStandardStationUrl(users) {
    var stationUrl = "";

    if (this.config.stationOverride) {
      stationUrl = this.config.stationOverride;
    } else {
      stationUrl = `http://www.last.fm/player/station/user/${users.join(",")}/library?provider=${this.config.affiliate}`;
    }

    return stationUrl;
  }

  alphabetSort(array) {
    return array.sort();
  }

  shuffle(array) {
    var counter = array.length;
    var temp;
    var index;

    // While there are elements in the array
    while (counter > 0) {
      // Pick a random index
      index = Math.floor(Math.random() * counter);

      // Decrease counter by 1
      counter--;

      // And swap the last element with it
      temp = array[counter];
      array[counter] = array[index];
      array[index] = temp;
    }

    return array;
  }

  getStationUrl(users, shuffleUsers) {
    var sortedUsers = shuffleUsers ? this.shuffle(users) : this.alphabetSort(users);
    var stationUrl = this.getStandardStationUrl(sortedUsers);
    return stationUrl;
  }

  getPlaylist(users, callback) {
    var stationUrl = this.getStationUrl(users, true);

    this.logger.info("getting playlist", stationUrl);

    request.get(stationUrl, (error, response, body) => {
      if (error) {
        this.logger.error("getPlaylist error", error.message);
        this.logger.info("Try again in one second...");
        setTimeout(() => this.getPlaylist(users, callback), 1000);
      } else if (response.statusCode === 200) {
        var lfm = JSON.parse(body);
        this.logger.info("doing radio callback!");
        callback(lfm);
      } else {
        this.logger.error("getPlaylist not 200", response.statusCode);
        this.logger.info("Try again in one second...");
        setTimeout(() => this.getPlaylist(users, callback), 1000);
      }
    });
  }
};
