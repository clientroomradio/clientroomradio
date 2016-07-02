"use strict";

// setup the testing framework
var chai = require("chai");
var spies = require("chai-spies");
chai.use(spies);
var expect = chai.expect;

// the unit under test
var Spotify = require("../lib/Spotify.js");

describe("Player", () => {
  var mockConfig;
  var mockLogger;
  var mockSp;
  var mockSpotifyWeb;
  var mockTrack;
  var mockError;
  var spotify;

  beforeEach(() => {
    mockConfig = {
      spotify: {
        username: "test-user",
        password: "1234"
      },
      noRepeatDays: 1
    };

    mockLogger = {
      info: () => {},
      error: () => {}
    };

    mockError = null;

    mockTrack = {
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
        callback(null, mockTrack);
      }),
      isTrackAvailable: () => {
        return true;
      }
    };

    mockSpotifyWeb = {
      login: (username, password, callback) => {
        callback(mockError, mockSp);
      }
    };

    spotify = new Spotify(
      mockConfig,
      mockLogger,
      mockSpotifyWeb);
  });

  describe("#on(\"login\")", () => {
    it("should emit login with error on login with error", done => {
      mockError = "error";

      spotify.on("login", err => {
        expect(err).to.equal(mockError);
        done();
      });

      spotify.login();
    });

    it("shouldn't emit login with error on login without error", done => {
      spotify.on("login", err => {
        expect(err).to.be.null;
        done();
      });

      spotify.login();
    });
  });

  describe("#isLoggedIn()", () => {
    it("shouldn't be logged in after login error", done => {
      mockError = "error";

      spotify.on("login", () => {
        expect(spotify.isLoggedIn()).to.be.false;
        done();
      });

      spotify.login();
    });

    it("should be logged in after successful login", done => {
      spotify.on("login", () => {
        expect(spotify.isLoggedIn()).to.be.true;
        done();
      });

      spotify.login();
    });
  });
});
