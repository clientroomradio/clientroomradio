"use strict";

// setup the testing framework
var chai = require("chai");
var spies = require("chai-spies");
chai.use(spies);
var expect = chai.expect;

// the unit under test
var PermissionManager = require("../lib/PermissionManager.js");

describe("PermissionManager", () => {
    var mockAllowedUsers,
        mockDataStore,
        mockUserDao,
        mockVotingManager,
        mockChat,
        mockSocket,
        mockLastfmClient,
        mockConfig,
        mockLogger,
        mockSuccessful,
        mockUser,
        capturedSocketOnCallback,
        capturedLoginCallback,
        permissionManager;

    beforeEach(() => {
        mockAllowedUsers = ["test-user"];

        mockConfig = {};

        mockDataStore = {
            read: () => { return mockAllowedUsers; },
            record: () => {}
        };

        mockLastfmClient = {
            userGetInfo: () => {}
        };

        mockLogger = {
            info: () => {},
            error: () => {}
        };

        mockUser = {
            username: "test-user"
        };

        mockUserDao = {
            addUser: chai.spy(() => { return mockUser; }),
            setAnonymousByUsername: () => {},
            setAllowedByUsername: () => {},
        };

        mockChat = {
            newUser: () => {},
            userJoined: chai.spy()
        };

        mockConfig = {
            whitelist: true
        };

        mockSocket = {
            on: (token, callback) => { capturedSocketOnCallback = callback; },
            sendToUser: () => {},
            newLoggedInUser: chai.spy()
        };

        mockLastfmClient = {
            login: chai.spy((token, callback) => { capturedLoginCallback = callback; })
        };

        mockVotingManager = {
            propose: chai.spy((type, user, data, callback) => {
                callback(mockSuccessful);
            })
        };

        permissionManager = new PermissionManager(mockDataStore,
                                                    mockUserDao,
                                                    mockVotingManager,
                                                    mockChat,
                                                    mockSocket,
                                                    mockLastfmClient,
                                                    mockConfig,
                                                    mockLogger);
    });

    describe("#isAllowedToJoin() with config.whitelist is undefined", () => {
        it("should always return false", () => {
            delete mockConfig.whitelist;
            expect(permissionManager.isAllowedToJoin("test-user")).to.be.false;
            expect(permissionManager.isAllowedToJoin("another-user")).to.be.false;
        });
    });

    describe("#isAllowedToJoin() with no config.whitelist===false", () => {
        it("should always return true", () => {
            mockConfig.whitelist = false;
            expect(permissionManager.isAllowedToJoin("test-user")).to.be.true;
            expect(permissionManager.isAllowedToJoin("another-user")).to.be.true;
        });
    });

    describe("#isAllowedToJoin() with no config.whitelist===true", () => {
        beforeEach(() => {
            mockConfig.whitelist = true;
        });

        it("should return true for allowed user", () => {
            expect(permissionManager.isAllowedToJoin("test-user")).to.be.true;
        });

        it("should return true for allowed user", () => {
            expect(permissionManager.isAllowedToJoin("another-user")).to.be.false;
        });

        it("should be case insensitive", () => {
            expect(permissionManager.isAllowedToJoin("TeSt-uSeR")).to.be.true;
        });
    });

    describe("#requestAccess()", () => {
        it("should request access", () => {
            permissionManager.requestAccess("new-user", "id");
            expect(mockVotingManager.propose).to.have.been.called.with("newUser", null, {"username": "new-user", "id": "id"});
        });

        it("should allow new user when successful", () => {
            mockSuccessful = true;
            mockUserDao.getUsers = () => { return { "newUser": {} }; };
            permissionManager.requestAccess("new-user", "id");
            expect(permissionManager.isAllowedToJoin("new-user")).to.be.true;
        });

        it("should not allow new user when unsuccessful", () => {
            mockSuccessful = false;
            permissionManager.requestAccess("new-user", "id");
            expect(permissionManager.isAllowedToJoin("new-user")).to.be.false;
        });
    });

    describe("socket.on", () => {
        it("should use token to login to lastfm", () => {
            capturedSocketOnCallback("token", "conn");
            expect(mockLastfmClient.login).to.have.been.called.with("token");
        });

        it("shouldn't do things when user logs in with error", () => {
            capturedSocketOnCallback("token", "conn");
            capturedLoginCallback("error", undefined);
        });

        it("should do things when allowed user logs in with no error", () => {
            capturedSocketOnCallback("token", "conn");
            capturedLoginCallback(null, {session: "session", user: "new-user", key: "key"});
            expect(mockUserDao.addUser).to.have.been.called.with("new-user");
            expect(mockChat.userJoined).to.not.have.been.called;
            expect(mockSocket.newLoggedInUser).to.have.been.called.with(mockUser);
        });

        it("should do things when not allowed user logs in with no error", () => {
            capturedSocketOnCallback("token", "conn");
            capturedLoginCallback(null, {session: "session", user: "test-user", key: "key"});
            expect(mockUserDao.addUser).to.have.been.called.with("test-user");
            expect(mockChat.userJoined).to.have.been.called.with(mockUser);
            expect(mockSocket.newLoggedInUser).to.have.been.called.with(mockUser);
        });
    });
    
});
