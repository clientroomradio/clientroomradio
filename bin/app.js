#!/usr/bin/env node

"use strict";

// Classes
var Backend = require("../lib/Backend.js");
var Chat = require("../lib/Chat.js");
var CurrentTrackManager = require("../lib/CurrentTrackManager.js");
var DataStore = require("../lib/DataStore.js");
var EndOfDayRequestManager = require("../lib/EndOfDayRequestManager.js");
var FrontendUpdater = require("../lib/FrontendUpdater.js");
var LastfmClient = require("../lib/LastfmClient.js");
var Logger = require("../lib/Logger.js");
var LoveManager = require("../lib/LoveManager.js");
var PermissionManager = require("../lib/PermissionManager.js");
var SkipManager = require("../lib/SkipManager.js");
var Socket = require("../lib/Socket.js");
var SocketServer = require("../lib/SocketServer.js");
var Spotify = require("../lib/Spotify.js");
var UserActivityFlagManager = require("../lib/UserActivityFlagManager.js");
var UserDao = require("../lib/UserDao.js");
var VotingManager = require("../lib/VotingManager.js");

// Instances
var config = require("/etc/crr/config.js");

// DI
var logger = new Logger(config);
var spotify = new Spotify(config, logger);
var dataStore = new DataStore(logger);
var lastfmClient = new LastfmClient(config, logger, dataStore);
var socket = new Socket(logger);
var socketServer = new SocketServer(socket, config, logger);
var userDao = new UserDao(dataStore, lastfmClient, socket, config, logger);
var chat = new Chat(socket, dataStore, userDao, config);
var votingManager = new VotingManager(chat, socket, userDao);
var currentTrackManager = new CurrentTrackManager(socket, chat, logger);
var skipManager = new SkipManager(socket, chat);

// Nothing depends on those:
new PermissionManager(dataStore, userDao, votingManager, chat, socket, lastfmClient, config, logger);
new Backend(userDao, currentTrackManager, lastfmClient, spotify, skipManager, socket, chat, logger);
new FrontendUpdater(socket, userDao, currentTrackManager, skipManager, chat);
new LoveManager(socket, currentTrackManager, chat, lastfmClient, logger);
new EndOfDayRequestManager(userDao, votingManager, socket);
new UserActivityFlagManager(userDao, chat, socket);

// Start
socketServer.start();
