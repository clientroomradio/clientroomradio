"use strict";

// setup the testing framework
var chai = require("chai");
var spies = require("chai-spies");
chai.use(spies);
var expect = chai.expect;

// the unit under test
var SkipManager = require("../lib/SkipManager.js");

describe("SkipManager", () => {
  var mockSocket;
  var mockChat;
  var mockUser;
  var mockUserDao;
  var mockCurrentTrackManager;
  var mockRadioUsers;
  var mockLogger;
  var capturedOnSkipCallback;
  var capturedCurrentTrackChangeCallback;
  var skipManager;

  beforeEach(() => {
    mockSocket = {
      on: (key, callback) => {
        capturedOnSkipCallback = callback;
      }
    };

    mockChat = {
      userHasAlreadySkipped: chai.spy(),
      inactiveUserWantsToSkip: chai.spy(),
      userSkipped: chai.spy(),
      skipSuccessful: chai.spy()
    };

    mockUser = {
      username: "test-user"
    };

    mockRadioUsers = ["test-user"];

    mockUserDao = {
      on: () => {},
      getRadioUsernames: () => {
        return mockRadioUsers;
      }
    };

    mockCurrentTrackManager = {
      on: (key, callback) => {
        capturedCurrentTrackChangeCallback = callback;
      }
    };

    mockLogger = {
      info: () => {}
    };

    skipManager = new SkipManager(mockUserDao, mockCurrentTrackManager, mockSocket, mockChat, mockLogger);
  });

  describe("#getSkippers()", () => {
    it("should start with 0 skippers", () => {
      expect(skipManager.getSkippers()).to.be.an('array').that.is.empty;
    });
  });

  describe("#setSkippers()", () => {
    var skipText = "I hate this song";

    it("shouldn't add inactive user", () => {
      mockUser.active = false;
      var skipManagerEmitSpy = chai.spy(skipManager.emit);

      capturedOnSkipCallback(mockUser, {text: skipText});

      expect(skipManagerEmitSpy).to.not.have.been.called;

      expect(skipManager.getSkippers()).to.be.empty;
      expect(skipManager.hasSkipped(mockUser)).to.be.false;

      expect(mockChat.inactiveUserWantsToSkip).to.be.called.with(mockUser, skipText);
      expect(mockChat.userHasAlreadySkipped).to.not.have.been.called;
      expect(mockChat.userSkipped).to.not.have.been.called;
    });

    it("shouldn't add a skipper twice", () => {
      mockUser.active = true;
      skipManager.skippers = ["test-user"];

      capturedOnSkipCallback(mockUser, {text: skipText});

      expect(skipManager.getSkippers()).to.deep.equal([mockUser.username]);
      expect(skipManager.hasSkipped(mockUser)).to.be.true;

      expect(mockChat.inactiveUserWantsToSkip).to.not.have.been.called;
      expect(mockChat.userHasAlreadySkipped).to.have.been.called.with(mockUser, skipText);
      expect(mockChat.userSkipped).to.not.have.been.called;
    });

    it("should add active user", () => {
      mockUser.active = true;

      capturedOnSkipCallback(mockUser, {text: skipText});

      expect(skipManager.getSkippers()).to.deep.equal([mockUser.username]);
      expect(skipManager.hasSkipped(mockUser)).to.be.true;

      expect(mockChat.inactiveUserWantsToSkip).to.not.have.been.called;
      expect(mockChat.userHasAlreadySkipped).to.not.have.been.called;
      expect(mockChat.userSkipped).to.be.called.with(mockUser, skipText);
    });

    it("should emit change when active user skips", done => {
      mockUser.active = true;

      skipManager.on("change", data => {
        expect(data.skippers).to.deep.equal([mockUser.username]);
        expect(data.skipLimit).to.equal(1);
        done();
      });

      capturedOnSkipCallback(mockUser, {text: skipText});
    });

    it("should emit skip when active user skips", done => {
      mockUser.active = true;

      skipManager.on("userSkip", (user, text) => {
        expect(user).to.equal(mockUser);
        expect(text).to.equal(skipText);
        done();
      });

      capturedOnSkipCallback(mockUser, {text: skipText});
    });
  });

  describe("currentTrackManager.on(\"change\")", () => {
    beforeEach(() => {
      skipManager.skippers = ["test-user"];
    });

    it("should clear the skippers", done => {
      // test that we get a change callback and the data is correct
      skipManager.on("change", data => {
        expect(data.skippers).to.be.empty;
        expect(data.skipLimit).to.equal(1);
        done();
      });

      // change to an empty track
      capturedCurrentTrackChangeCallback({});
      expect(skipManager.getSkippers()).to.be.empty;
    });
  });

  describe("#getSkipLimit()", () => {
    it("should return the correct value for the number of radio users", () => {
      mockRadioUsers = [];
      expect(skipManager.getSkipLimit()).to.equal(0);
      mockRadioUsers.push("test-user");
      expect(skipManager.getSkipLimit()).to.equal(1);
      mockRadioUsers.push("test-user");
      expect(skipManager.getSkipLimit()).to.equal(1);
      mockRadioUsers.push("test-user");
      expect(skipManager.getSkipLimit()).to.equal(2);
      mockRadioUsers.push("test-user");
      expect(skipManager.getSkipLimit()).to.equal(2);
      mockRadioUsers.push("test-user");
      expect(skipManager.getSkipLimit()).to.equal(3);
      mockRadioUsers.push("test-user");
      expect(skipManager.getSkipLimit()).to.equal(3);
    });
  });
});
