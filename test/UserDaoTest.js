"use strict";

// setup the testing framework
var chai = require("chai");
var spies = require("chai-spies");
chai.use(spies);
var expect = chai.expect;

// the unit under test
var UserDao = require("../lib/UserDao.js");

describe("UserDao", () => {
    var mockDataStore,
        mockSocket,
        mockLastfmClient,
        mockConfig,
        mockLogger,
        userDao;

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
});