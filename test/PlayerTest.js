"use strict";

// setup the testing framework
var chai = require("chai");
var spies = require("chai-spies");
chai.use(spies);
var expect = chai.expect;

// the unit under test
var Player = require("../lib/Player.js");

describe("Player", () => {
  var mockConfig;
  var mockLogger;
  var mockStream;
  var mockTrack;
  var mockTrackId;
  var mockUserDao;
  var mockSkipManager;
  var mockDataStore;
  var mockAudioService;
  var player;

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

    mockSkipManager = {
      on: () => {}
    };

    mockStream = {
      on: () => {}
    };

    mockTrack = {
      artists: [{name: "artist"}],
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

    mockUserDao = {
      broadcast: () => {}
    };

    mockDataStore = {
      read: () => {},
      record: () => {}
    };

    mockAudioService = {
      login: () => {},
      on: () => {},
      close: () => {},
      getStream: chai.spy((uri, playlistTrack, handlers) => {
        handlers.success(mockStream, mockTrack, 20);
      }),
      getTrackIdFromURI: () => {
        return mockTrackId;
      }
    };

    player = new Player(
      mockUserDao,
      mockSkipManager,
      mockConfig,
      mockLogger,
      mockDataStore,
      mockAudioService);
  });

  afterEach(() => {
    player.close();
  });

  describe("#playTrack", () => {
    it("should call get", () => {
      var uri = "spotify:track:1234567890";
      var requester = "test-user";
      var handlers = {
        success: () => {},
        error: () => {}
      };
      var playlistTrack;
      mockTrackId = "1234567890";

      player.playTrack(uri, requester, handlers, playlistTrack);
      expect(mockAudioService.getStream).to.have.been.called.with(uri);
    });

    it("should play track (request hasn't been played before)", () => {
      var spotifyUri = "spotify:track:1234567890";
      var requester = "test-user";
      var handlers = {
        success: chai.spy(),
        error: chai.spy()
      };
      var playlistTrack;
      mockTrackId = "1234567890";

      expect(player.isPlayedTrack(spotifyUri)).to.be.false;

      player.playTrack(spotifyUri, requester, handlers, playlistTrack);
      expect(handlers.success).to.have.been.called();
      expect(handlers.error).to.not.have.been.called();
    });

    it("should play track (request has been played before)", () => {
      var spotifyUri = "spotify:track:1234567890";
      var requester = "test-user";
      var handlers = {
        success: chai.spy(),
        error: chai.spy()
      };
      var playlistTrack;
      mockTrackId = "1234567890";

      player.playedTracks = [
        {
          id: "1234567890",
          timestamp: new Date().getTime()
        }
      ];

      expect(player.isPlayedTrack(spotifyUri)).to.be.true;

      player.playTrack(spotifyUri, requester, handlers, playlistTrack);
      expect(handlers.success).to.have.been.called();
      expect(handlers.error).to.not.have.been.called();
    });

    it("should play track (non-request hasn't been played before)", () => {
      var spotifyUri = "spotify:track:1234567890";
      var requester;
      var handlers = {
        success: chai.spy(),
        error: chai.spy()
      };
      var optionalTrack;

      expect(player.isPlayedTrack(spotifyUri)).to.be.false;

      player.playTrack(spotifyUri, requester, handlers, optionalTrack);
      expect(handlers.success).to.have.been.called();
      expect(handlers.error).to.not.have.been.called();
    });

    it("shouldn't play track (non-request has been played before)", () => {
      var spotifyUri = "spotify:track:1234567890";
      var requester;
      var handlers = {
        success: chai.spy(),
        error: chai.spy()
      };
      var optionalTrack;

      player.playedTracks = [
        {
          id: "1234567890",
          timestamp: new Date().getTime()
        }
      ];

      mockAudioService.getTrackIdFromURI = () => {
        return "1234567890";
      };

      expect(player.isPlayedTrack(spotifyUri)).to.be.true;

      player.playTrack(spotifyUri, requester, handlers, optionalTrack);
      expect(handlers.success).to.not.have.been.called();
      expect(handlers.error).to.have.been.called();
    });

    it("should call success", done => {
      var uri = "spotify:track:1234567890";
      var requester = "test-user";
      var playlistTrack;
      mockTrackId = "1234567890";

      var handlers = {
        success: track => {
          expect(track.artists[0].name).to.equal(mockTrack.artists[0].name);
          expect(track.name).to.equal(mockTrack.name);
          expect(track.extension.requester).to.equal(requester);
          expect(track.extension.artistpage).to.equal(`http://www.last.fm/music/${encodeURIComponent(mockTrack.artists[0].name)}`);
          expect(track.extension.trackpage).to.equal(`http://www.last.fm/music/${encodeURIComponent(mockTrack.artists[0].name)}/_/${encodeURIComponent(mockTrack.name)}`);
          done();
        },
        error: () => {}
      };

      player.playTrack(uri, requester, handlers, playlistTrack);
    });
  });
});
