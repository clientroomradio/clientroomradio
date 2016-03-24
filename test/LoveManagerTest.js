"use strict";

// setup the testing framework
var chai = require("chai");
var spies = require("chai-spies");
chai.use(spies);
var expect = chai.expect;

// the unit under test
var LoveManager = require("../lib/LoveManager.js");

describe("LoveManager", () => {
  var mockSocket;
  var mockCurrentTrackManager;
  var mockChat;
  var mockLastfmClient;
  var mockLogger;
  var mockLfm;
  var mockError;
  var mockUser;
  var mockTrack;
  var loveManager;

  beforeEach(() => {
    mockSocket = {
      on: () => {}
    };

    mockCurrentTrackManager = {
      getCurrentTrack: chai.spy(() => {
        return mockTrack;
      }),
      updateLoveFlag: chai.spy()
    };

    mockChat = {
      userLoved: chai.spy(),
      userUnloved: chai.spy()
    };

    mockLfm = {
    };

    mockTrack = {
      artists: [{name: "artist"}],
      name: "title"
    };

    mockError = null;

    mockUser = {
      username: "test-user"
    };

    mockLastfmClient = {
      setLoveStatus: chai.spy((user, currentTrack, loveFlag, callback) => {
        callback(mockLfm, mockError);
      })
    };

    mockLogger = {
      info: () => {},
      error: () => {}
    };

    loveManager = new LoveManager(mockSocket,
      mockCurrentTrackManager,
      mockChat,
      mockLastfmClient,
      mockLogger);
  });

  describe("#update() => lastfmClient.setLoveStatus()", () => {
    it("should call lastfmClient.setLoveStatus when user loved", () => {
      loveManager.update(mockUser, true);
      expect(mockLastfmClient.setLoveStatus).to.have.been.called.with(mockUser, mockTrack, true);
    });

    it("should call lastfmClient.setLoveStatus when user unloved", () => {
      loveManager.update(mockUser, false);
      expect(mockLastfmClient.setLoveStatus).to.have.been.called.with(mockUser, mockTrack, false);
    });
  });

  describe("#update() => chat.userLoved() and chat.userUnloved()", () => {
    it("should only call chat.userLoved when user loved", () => {
      loveManager.update(mockUser, true);
      expect(mockChat.userLoved).to.have.been.called.with(mockUser);
      expect(mockChat.userUnloved).to.have.been.called.exactly(0);
    });

    it("should only call chat.userUnloved when user unloved", () => {
      loveManager.update(mockUser, false);
      expect(mockChat.userUnloved).to.have.been.called.with(mockUser);
      expect(mockChat.userLoved).to.have.been.called.exactly(0);
    });
  });

  describe("#update() => currentTrackManager.setLoveStatus()", () => {
    it("should call updateLoveFlag with username and 0 when user unloved", () => {
      loveManager.update(mockUser, false);
      expect(mockCurrentTrackManager.updateLoveFlag).to.have.been.called.with(mockUser.username, "0");
    });

    it("should call updateLoveFlag with username and 1 when user loved", () => {
      loveManager.update(mockUser, true);
      expect(mockCurrentTrackManager.updateLoveFlag).to.have.been.called.with(mockUser.username, "1");
    });
  });
});
