"use strict";

// setup the testing framework
var chai = require("chai");
var spies = require("chai-spies");
chai.use(spies);
var expect = chai.expect;

// the unit under test
var SkipManager = require("../lib/SkipManager.js");

describe("SkipManager", () => {
    var mockSocket,
        mockChat,
        mockUser,
        capturedOnSkipCallback,
        skipManager;

    beforeEach(() => {
        mockSocket = {
            on: (key, callback) => { capturedOnSkipCallback = callback; }
        };

        mockChat = {
            userHasAlreadySkipped: chai.spy(),
            inactiveUserWantsToSkip: chai.spy(),
            userSkipped: chai.spy()
        };

        mockUser = {
            username: "test-user"
        };

        skipManager = new SkipManager(mockSocket, mockChat);
    });

    describe("#getSkippers()", () => {
        it("should start with 0 skippers", () => {
            expect(skipManager.getSkippers()).to.be.zero;
        });
    });

    describe("#setSkippers()", () => {
        var skipText = "I hate this song";

        it("shouldn't add inactive user", () => {
            mockUser["active"] = false;
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
            mockUser["active"] = true;
            skipManager.skippers = ["test-user"];

            capturedOnSkipCallback(mockUser, {text: skipText});

            expect(skipManager.getSkippers()).to.deep.equal([mockUser.username]);
            expect(skipManager.hasSkipped(mockUser)).to.be.true;

            expect(mockChat.inactiveUserWantsToSkip).to.not.have.been.called;
            expect(mockChat.userHasAlreadySkipped).to.have.been.called.with(mockUser, skipText);
            expect(mockChat.userSkipped).to.not.have.been.called;
        });

        it("should add active user", () => {
            mockUser["active"] = true;

            capturedOnSkipCallback(mockUser, {text: skipText});

            expect(skipManager.getSkippers()).to.deep.equal([mockUser.username]);
            expect(skipManager.hasSkipped(mockUser)).to.be.true;

            expect(mockChat.inactiveUserWantsToSkip).to.not.have.been.called;
            expect(mockChat.userHasAlreadySkipped).to.not.have.been.called;
            expect(mockChat.userSkipped).to.be.called.with(mockUser, skipText);
        });

        it("should emit change when active user skips", (done) => {
            mockUser["active"] = true;

            skipManager.on("change", (skippers) => {
                expect(skippers).to.deep.equal([mockUser.username]);
                done();
            });

            capturedOnSkipCallback(mockUser, {text: skipText});
        });

        it("should emit skip when active user skips", (done) => {
            mockUser["active"] = true;

            skipManager.on("skip", (user, skippers) => {
                expect(user).to.equal(mockUser);
                expect(skippers).to.deep.equal([mockUser.username]);
                done();
            });

            capturedOnSkipCallback(mockUser, {text: skipText});
        });
    });

    describe("#clear()", () => {
        beforeEach(() => {
            skipManager.skippers = ["test-user"];
        });

        it("should clear the skippers", (done) => {
            expect(skipManager.getSkippers()).to.deep.equal(["test-user"]);

            skipManager.on("change", (skippers) => {
                expect(skippers).to.be.empty;
                done();
            });

            skipManager.clear();
            expect(skipManager.getSkippers()).to.be.empty;
        });
    });
});
