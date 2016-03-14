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
        mockIsPlaying,
        mockIsLoggedIn,
        backend;

    beforeEach(() => {
        mockRadioUsernames = [];

        mockUserDao = {
            on: () => {},
            broadcast: () => {},
            getRadioUsernames: () => { return mockRadioUsernames; }
        };

        mockCurrentTrackManager = {};
        mockLastfmClient = {
            getPlaylist: chai.spy(),
            getStationUrl: () => { return "mock://station/url"; }
        };
        
        mockIsPlaying = false;
        mockIsLoggedIn = true;

        mockSpotify = {
            on: () => {},
            isPlaying: () => { return mockIsPlaying; },
            isLoggedIn: () => { return mockIsLoggedIn; }
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

    describe("#startRadio()", () => {
        it("should start radio when not playing", () => {
            mockRadioUsernames = ["test-user"];
            backend.startRadio(mockRadioUsernames);
            expect(mockLastfmClient.getPlaylist).to.have.been.called.with(mockRadioUsernames);
        });

        it("should not start radio when playing", () => {
            mockRadioUsernames = ["test-user"];
            mockIsPlaying = true;
            backend.startRadio(mockRadioUsernames);
            expect(mockLastfmClient.getPlaylist).to.not.have.been.called;
        });

        it("should not start radio when not logged in", () => {
            mockRadioUsernames = ["test-user"];
            mockIsLoggedIn = false;
            backend.startRadio(mockRadioUsernames);
            expect(mockLastfmClient.getPlaylist).to.not.have.been.called;
        });
    });
});