"use strict";

// setup the testing framework
var chai = require("chai");
var spies = require("chai-spies");
chai.use(spies);
var expect = chai.expect;

// the unit under test
var UserDao = require("../lib/UserDao.js");

describe("UserDao", () => {
  var mockDataStore;
  var mockSocket;
  var mockLastfmClient;
  var mockConfig;
  var mockLogger;
  var userDao;

  beforeEach(() => {
    mockDataStore = {
      read: () => {},
      record: () => {}
    };

    mockSocket = {
      on: () => {},
      sendToUser: () => {}
    };

    mockLastfmClient = {
      userGetInfo: () => {}
    };

    mockConfig = {
      lfm: {
        api_key: "key"
      }
    };

    mockLogger = {
      info: () => {},
      error: () => {}
    };

    userDao = new UserDao(mockDataStore,
      mockLastfmClient,
      mockSocket,
      mockConfig,
      mockLogger);
  });

  describe("#addUser()", () => {
    it("should add user", () => {
      var username = "test-user";
      var sessionId = "session-id";
      var lastfmSessionKey = "lfm-session-key";
      var allowed = false;

      userDao.addUser(username, sessionId, lastfmSessionKey, allowed);

      expect(userDao.getUsers()).to.have.ownProperty(username);
    });
  });

  describe("#getScrobbleUsers()", () => {
    it("should return scrobbling users", () => {
      userDao.addUser("user", "session1", "sk", true);
      userDao.addUser("user-not-allowed", "session2", "sk", false);
      userDao.addUser("user-not-active", "session3", "sk", true);
      userDao.getUsers()["user-not-active"].active = false;
      userDao.addUser("user-muted", "session4", "sk", true);
      userDao.getUsers()["user-muted"].muted = true;
      userDao.addUser("user-not-scrobbling", "session5", "sk", true);
      userDao.getUsers()["user-not-scrobbling"].scrobbling = false;

      expect(Object.keys(userDao.getScrobbleUsers()).length).to.equal(2);
      expect(userDao.getScrobbleUsers()).to.have.property("user");
      expect(userDao.getScrobbleUsers()).to.have.property("user-muted");
    });
  });
});
