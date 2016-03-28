"use strict";

// setup the testing framework
var chai = require("chai");
var spies = require("chai-spies");
chai.use(spies);
var expect = chai.expect;

// the unit under test
var Spotify = require("../lib/Spotify.js");

describe("Spotify", () => {
  var mockConfig;
  var mockLogger;
  var mockSpotifyWeb;
  var mockSp;
  var mockSpTrack;
  var mockUserDao;
  var mockSkipManager;
  var mockError;
  var mockDataStore;
  var spotify;

  beforeEach(() => {
    mockConfig = {
      spotify: {
        username: "test-user",
        password: "1234"
      }
    };

    mockLogger = {
      info: () => {},
      error: () => {}
    };

    mockSkipManager = {
      on: () => {}
    };

    mockError = null;

    mockSpotifyWeb = {
      login: chai.spy((username, password, callback) => {
        setTimeout(() => {
          callback(mockError, mockSp);
        }, 0);
      })
    };

    mockSpTrack = {
      artist: [{name: "artist"}],
      name: "title",
      duration: 2000, // 2 seconds long
      play: () => {
        return {
          // a mock stream
          pipe: () => {},
          on: () => {}
        };
      }
    };

    mockSp = {
      get: chai.spy((uri, callback) => {
        callback(null, mockSpTrack);
      }),
      isTrackAvailable: () => {
        return true;
      }
    };

    mockUserDao = {
      broadcast: () => {}
    };

    mockDataStore = {
      read: () => {},
      record: () => {}
    };
  });

  afterEach(() => {
    spotify.close();
  });

  describe("#on(\"login\")", () => {
    it("should emit login with error on login with error", done => {
      mockError = "error";

      spotify = new Spotify(mockUserDao, mockSkipManager, mockConfig, mockLogger, mockDataStore, mockSpotifyWeb);
      spotify.on("login", err => {
        expect(err).to.equal(mockError);
        done();
      });
    });

    it("shouldn't emit login with error on login without error", done => {
      spotify = new Spotify(mockUserDao, mockSkipManager, mockConfig, mockLogger, mockDataStore, mockSpotifyWeb);
      spotify.on("login", err => {
        expect(err).to.be.null;
        done();
      });
    });
  });

  describe("#isLoggedIn()", () => {
    it("shouldn't be logged in after login error", done => {
      mockError = "error";

      spotify = new Spotify(mockUserDao, mockSkipManager, mockConfig, mockLogger, mockDataStore, mockSpotifyWeb);
      spotify.on("login", () => {
        expect(spotify.isLoggedIn()).to.be.false;
        done();
      });
    });

    it("should be logged in after successful login", done => {
      spotify = new Spotify(mockUserDao, mockSkipManager, mockConfig, mockLogger, mockDataStore, mockSpotifyWeb);
      spotify.on("login", () => {
        expect(spotify.isLoggedIn()).to.be.true;
        done();
      });
    });
  });

  describe("#playTrack", () => {
    it("should call get with the spotify uri", done => {
      var spotifyUri = "spotify:track:1234567890";
      var requester = "test-user";
      var handlers = {
        success: () => {},
        error: () => {}
      };
      var optionalTrack;

      spotify = new Spotify(mockUserDao, mockSkipManager, mockConfig, mockLogger, mockDataStore, mockSpotifyWeb);
      spotify.on("login", () => {
        spotify.playTrack(spotifyUri, requester, handlers, optionalTrack);
        expect(mockSp.get).to.have.been.called.with(spotifyUri);
        done();
      });
    });

    it("should call success", done => {
      var spotifyUri = "spotify:track:1234567890";
      var requester = "test-user";
      var handlers = {
        success: track => {
          expect(track.identifier).to.equal(spotifyUri);
          expect(track.artists[0].name).to.equal(mockSpTrack.artist[0].name);
          expect(track.name).to.equal(mockSpTrack.name);
          expect(track.duration).to.equal(mockSpTrack.duration);
          expect(track.extension.requester).to.equal(requester);
          expect(track.extension.artistpage).to.equal(`http://www.last.fm/music/${encodeURIComponent(mockSpTrack.artist[0].name)}`);
          expect(track.extension.trackpage).to.equal(`http://www.last.fm/music/${encodeURIComponent(mockSpTrack.artist[0].name)}/_/${encodeURIComponent(mockSpTrack.name)}`);
          done();
        },
        error: () => {}
      };
      var optionalTrack;

      spotify = new Spotify(mockUserDao, mockSkipManager, mockConfig, mockLogger, mockDataStore, mockSpotifyWeb);
      spotify.on("login", () => {
        spotify.playTrack(spotifyUri, requester, handlers, optionalTrack);
      });
    });
  });
});
