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
        capturedParams,
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

        capturedParams = {};

        mockLasfm = {
            request: chai.spy((method, params) => {
                capturedParams = params;
                params.handlers.success({});
            })
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

    describe("#setLoveStatus()", () => {
        var track, user;

        beforeEach(() => {
            track = {
                artists: [{name: "artist"}],
                name: "title"
            };

            user = {
                username: "test-user",
                sk: "sk"
            };
        });

        it("should call track.love when asked to love", (done) => {
            lastfmClient.setLoveStatus(user, track, true, () => {
                expect(mockLasfm.request).to.have.been.called.with("track.love");
                expect(capturedParams).to.have.property("track", "title");
                expect(capturedParams).to.have.property("artist", "artist");
                expect(capturedParams).to.have.property("sk", "sk");
                done();
            });
        });

        it("should call track.unlove when asked to unlove", (done) => {
            lastfmClient.setLoveStatus(user, track, false, () => {
                expect(mockLasfm.request).to.have.been.called.with("track.unlove");
                expect(capturedParams).to.have.property("track", "title");
                expect(capturedParams).to.have.property("artist", "artist");
                expect(capturedParams).to.have.property("sk", "sk");
                done();
            });
        });
    });
});