"use strict";

// setup the testing framework
var chai = require("chai");
var spies = require("chai-spies");
chai.use(spies);
var expect = chai.expect;

// the unit under test
var Backend = require("../lib/Backend.js");

describe("Backend", () => {
    var mockRadioUsernames,
        mockUserDao,
        mockCurrentTrackManager,
        mockLastfmClient,
        mockSpotify,
        mockSkipManager,
        mockSocket,
        mockChat,
        mockLogger,
        backend;

    beforeEach(() => {
        mockRadioUsernames = [];

        mockUserDao = {
            on: () => {},
            broadcast: () => {},
            getRadioUsernames: () => { return mockRadioUsernames; }
        };

        mockCurrentTrackManager = {};
        mockLastfmClient = {};
        
        mockSpotify = {
            on: () => {}
        };
        
        mockSkipManager = {
            on: () => {}
        };

        mockSocket = {
            on: () => {}
        };

        mockChat = {};

        mockLogger = {
            info: () => {},
            error: () => {}
        };

        backend = new Backend(mockUserDao,
                                mockCurrentTrackManager,
                                mockLastfmClient,
                                mockSpotify,
                                mockSkipManager,
                                mockSocket,
                                mockChat,
                                mockLogger);
    });

    describe("#isBingo()", () => {
        it("should always be false when there is one user", () => {
            expect(backend.isBingo(["test-user"], {})).to.be.false;
            expect(backend.isBingo(["test-user"], {"test-user": {}})).to.be.false;
        });

        it("should be false when not all users have listened", () => {
            expect(backend.isBingo(["test-user", "test-user-too"], {"test-user": {}})).to.be.false;
            expect(backend.isBingo(["test-user", "test-user-too"], {"test-user": {}, "test-user-away": {}})).to.be.false;
        });

        it("should be true when all listeners have listened", () => {
            expect(backend.isBingo(["test-user", "test-user-too"], {"test-user": {}, "test-user-too": {}})).to.be.true;
        });
    });
});