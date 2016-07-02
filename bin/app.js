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
var Player = require("../lib/Player.js");
var YouTube = require("../lib/YouTube.js");
var Spotify = require("../lib/Spotify.js");
var UserActivityFlagManager = require("../lib/UserActivityFlagManager.js");
var UserDao = require("../lib/UserDao.js");
var VotingManager = require("../lib/VotingManager.js");

// Instances
var config = require("/etc/crr/config.js");

class ClientRoomRadio {
  constructor() {
    // DI
    this.logger = new Logger(config);
    this.dataStore = new DataStore(this.logger);
    this.lastfmClient = new LastfmClient(config, this.logger);
    this.socket = new Socket(this.logger);
    this.socketServer = new SocketServer(this.socket, config, this.logger);
    this.userDao = new UserDao(this.dataStore, this.lastfmClient, this.socket,
        config, this.logger);
    this.chat = new Chat(this.socket, this.dataStore, this.userDao, config);
    this.votingManager = new VotingManager(this.chat, this.socket,
        this.userDao);
    this.currentTrackManager = new CurrentTrackManager(this.socket, this.chat,
        this.logger);
    this.skipManager = new SkipManager(this.userDao, this.currentTrackManager,
        this.socket, this.chat, this.logger);
    this.audioService = (config.affiliate === "youtube") ?
        new YouTube(config, this.logger) :
        new Spotify(config, this.logger);
    this.player = new Player(this.userDao, this.skipManager, config,
        this.logger, this.dataStore, this.audioService);

    // Nothing depends on these:
    this.permissionManager = new PermissionManager(this.dataStore, this.userDao,
        this.votingManager, this.chat, this.socket, this.lastfmClient, config,
        this.logger);
    this.backend = new Backend(this.userDao, this.currentTrackManager,
        this.lastfmClient, this.player, this.skipManager, this.socket,
        this.chat, this.logger);
    this.frontendUpdater = new FrontendUpdater(this.socket, this.userDao,
        this.currentTrackManager, this.skipManager, this.chat);
    this.loveManager = new LoveManager(this.socket, this.currentTrackManager,
        this.chat, this.lastfmClient, this.logger);
    this.endOfDayRequestManager = new EndOfDayRequestManager(this.userDao,
        this.votingManager, this.socket);
    this.userActivityFlagManager = new UserActivityFlagManager(this.userDao,
        this.chat, this.socket);
  }

  start() {
    this.player.login();
    this.socketServer.start();
  }
}

var clientRoomRadio = new ClientRoomRadio();
clientRoomRadio.start();
