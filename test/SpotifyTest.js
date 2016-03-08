"use strict";

// setup the testing framework
var chai = require("chai");
var spies = require("chai-spies");
chai.use(spies);
var expect = chai.expect;

// the unit under test
var Spotify = require("../lib/Spotify.js");

describe("Spotify", () => {
    var mockConfig,
        mockLogger,
        mockSpotifyWeb,
        mockSp,
        mockSpTrack,
        mockError;

    beforeEach(() => {
        mockConfig = {
            spotify: {
                "username": "test-user",
                "password": "1234"
            }
        };

        mockLogger = {
            info: () => {},
            error: () => {}
        };

        mockError = null;

        mockSpotifyWeb = {
            login: chai.spy((username, password, callback) => { callback(mockError, mockSp); } )
        };

        mockSpTrack = {
            artist: [{name: "artist"}],
            name: "title",
            duration: 2000 // 2 seconds long
        };

        mockSp = {
            get: chai.spy((uri, callback) => { callback(null, mockSpTrack); } ),
            isTrackAvailable: (spTrack, country) => { return true; }
        };
    });

    describe("#isLoggedIn()", () => {
        it("should return false when there was an error on login", () => {
            mockError = "error";

            var spotify = new Spotify(mockConfig, mockLogger, mockSpotifyWeb);
            expect(spotify.isLoggedIn()).to.equal(false);
        });

        it("should return true when logged in", () => {
            var spotify = new Spotify(mockConfig, mockLogger, mockSpotifyWeb);
            expect(spotify.isLoggedIn()).to.equal(true);
        });
    });

    describe("#playTrack", () => {
        it("should call get with the spotify uri", () => {
            var spotifyUri = "spotify:track:1234567890";
            var requester = "test-user";
            var handlers = {
                success: (track, port) => {
                },
                error: error => {
                }
            };
            var optionalTrack;

            var spotify = new Spotify(mockConfig, mockLogger, mockSpotifyWeb);
            spotify.playTrack(spotifyUri, requester, handlers, optionalTrack);

            expect(mockSp.get).to.have.been.called.with(spotifyUri);
        });
    });
});