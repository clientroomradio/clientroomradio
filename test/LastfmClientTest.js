"use strict";

// setup the testing framework
var chai = require("chai");
var spies = require("chai-spies");
chai.use(spies);
var expect = chai.expect;

// the unit under test
var LastfmClient = require("../lib/LastfmClient.js");

describe("LastfmClient", () => {
    var mockConfig,
        mockLogger,
        mockDataStore,
        mockLasfm,
        lastfmClient;

    beforeEach(() => {
        mockConfig = {
            lfm: {
                api_key: "api_key",
                secret: "secret"}
        };

        mockLogger = {
            info: () => {},
            error: () => {}
        };

        mockDataStore = {
            read: () => {},
            record: () => {}
        };

        mockLasfm = {
            request: chai.spy()
        };

        lastfmClient = new LastfmClient(mockConfig, mockLogger, mockDataStore, mockLasfm);
    });

    describe("#scrobble()", () => {
        var track, scrobbleUsers, skippers;

        beforeEach(() => {
            track = {
                artists: [{name: "artist"}],
                name: "title",
                duration: 60000, // one minute long
                timestamp: new Date().getTime() - 45000, // we started listening 45 seconds ago
                extension: {}
            };

            scrobbleUsers = {
                "test-user": {
                    username: "test-user",
                    sk: "sk"
                }
            };

            skippers = [];
        });

        it("should scrobble for non skippers", () => {
            lastfmClient.scrobble(track, scrobbleUsers, skippers);
            expect(mockLasfm.request).to.have.been.called.with("track.scrobble");
        });

        it("shouldn't scrobble for skippers", () => {
            skippers.push("test-user");
            lastfmClient.scrobble(track, scrobbleUsers, skippers);
            expect(mockLasfm.request).to.not.have.been.called;
        });
    });
});