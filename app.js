// Classes
var Backend = require("./lib/Backend.js");
var Chat = require("./lib/Chat.js");
var CurrentTrackManager = require("./lib/CurrentTrackManager.js");
var DataStore = require("./lib/DataStore.js");
var EndOfDayRequestManager = require("./lib/EndOfDayRequestManager.js");
var ExpressExternal = require("./lib/ExpressExternal.js");
var ExternalHttpServer = require("./lib/ExternalHttpServer.js");
var FrontendUpdater = require("./lib/FrontendUpdater.js");
var HeartbeatManager = require("./lib/HeartbeatManager.js");
var LastfmClient = require("./lib/LastfmClient.js");
var Logger = require("./lib/Logger.js");
var LoveManager = require("./lib/LoveManager.js");
var PermissionChecker = require("./lib/PermissionChecker.js");
var PermissionFetcher = require("./lib/PermissionFetcher.js");
var ScrobblingManager = require("./lib/ScrobblingManager.js");
var SkipManager = require("./lib/SkipManager.js");
var Socket = require("./lib/Socket.js");
var Spotify = require("./lib/Spotify.js");
var UserActivityFlagManager = require("./lib/UserActivityFlagManager.js");
var UserDao = require("./lib/UserDao.js");
var VotingManager = require("./lib/VotingManager.js");

// Instances
var config = require("./config.js");

// DI
var logger = new Logger();
var spotify = new Spotify(logger);
var permissionFetcher = new PermissionFetcher(config);
var permissionChecker = new PermissionChecker(permissionFetcher, logger);
var dataStore = new DataStore(logger);
var lastfmClient = new LastfmClient(config, logger, dataStore);
var userDao = new UserDao(dataStore, lastfmClient, logger);
var socket = new Socket(userDao, permissionChecker, logger);
var chat = new Chat(socket, config);
var currentTrackManager = new CurrentTrackManager(socket, chat, logger);
var skipManager = new SkipManager(socket, chat);
var expressExternal = new ExpressExternal(config, lastfmClient, userDao, chat, permissionChecker, logger);
var externalHttpServer = new ExternalHttpServer(expressExternal, socket, config, logger);
var votingManager = new VotingManager(chat, socket);
var heartbeatManager = new HeartbeatManager(socket, chat, userDao);

// Nothing depends on those:

new Backend(dataStore, currentTrackManager, lastfmClient, spotify, skipManager, socket, chat, logger);
new FrontendUpdater(socket, userDao, currentTrackManager, skipManager, dataStore);
new ScrobblingManager(socket, userDao);
new LoveManager(socket, currentTrackManager, chat, lastfmClient, logger);
new EndOfDayRequestManager(userDao, votingManager, socket);
new UserActivityFlagManager(userDao, chat, socket);

// Start
expressExternal.start();
externalHttpServer.start();
heartbeatManager.start();
