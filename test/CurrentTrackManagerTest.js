"use strict";

// setup the testing framework
var chai = require("chai");
var spies = require("chai-spies");
chai.use(spies);
var expect = chai.expect;

// the unit under test
var CurrentTrackManager = require("../lib/CurrentTrackManager.js");

describe("CurrentTrackManager", () => {
  var mockSocket;
  var mockChat;
  var mockLogger;
  var mockTrack;
  var currentTrackManager;

  beforeEach(() => {
    mockSocket = {
      on: () => {}
    };

    mockChat = {
      newTrack: chai.spy()
    };

    mockLogger = {
      info: () => {},
      error: () => {}
    };

    mockTrack = {
      identifier: "id",
      context: {}
    };

    currentTrackManager = new CurrentTrackManager(mockSocket,
      mockChat,
      mockLogger);
  });

  describe("#setCurrentTrack()", () => {
    it("should do things when called", done => {
      currentTrackManager.on("change", newTrack => {
        expect(newTrack).to.equal(mockTrack);
        done();
      });

      currentTrackManager.setCurrentTrack(mockTrack);
      expect(mockChat.newTrack).to.have.been.called.with(mockTrack);
    });

    it("should not do things when called with the same track", done => {
      currentTrackManager.setCurrentTrack(mockTrack);

      currentTrackManager.on("change", newTrack => {
        expect(newTrack).to.equal(mockTrack);
        done();
      });

      currentTrackManager.setCurrentTrack(mockTrack);
      expect(mockChat.newTrack).to.not.have.been.called;
    });
  });

  describe("#getCurrentTrack()", () => {
    it("should return an empty track at startup", () => {
      expect(currentTrackManager.getCurrentTrack()).to.be.empty;
    });

    it("should return the current track", () => {
      currentTrackManager.setCurrentTrack(mockTrack);
      expect(currentTrackManager.getCurrentTrack()).to.equal(mockTrack);
    });
  });

  describe("#updateLoveFlag()", () => {
    it("should update the love flag for a user", done => {
      var username = "test-user";
      currentTrackManager.setCurrentTrack(mockTrack);

      currentTrackManager.on("change", newTrack => {
        expect(newTrack.context[username].username).to.equal(username);
        expect(newTrack.context[username].userloved).to.be.true;
        expect(newTrack.context[username].userplaycount).to.equal(0);
        done();
      });

      currentTrackManager.updateLoveFlag(username, true);
    });
  });
});
