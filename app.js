// Classes
var Backend = require("./lib/Backend.js");
var Chat = require("./lib/Chat.js");
var CurrentTrackChatUpdater = require("./lib/CurrentTrackChatUpdater.js");
var CurrentTrackDao = require("./lib/CurrentTrackDao.js");
var DataStore = require("./lib/DataStore.js");
var EndOfDayRequestManager = require("./lib/EndOfDayRequestManager.js");
var DiscoveryHourRequestManager = require("./lib/DiscoveryHourRequestManager.js");
var ExpressExternal = require("./lib/ExpressExternal.js");
var ExpressInternal = require("./lib/ExpressInternal.js");
var ExternalHttpServer = require("./lib/ExternalHttpServer.js");
var FrontendUpdater = require("./lib/FrontendUpdater.js");
var HeartbeatManager = require("./lib/HeartbeatManager.js");
var LastfmClient = require("./lib/LastfmClient.js");
var Logger = require("./lib/Logger.js");
var LoveManager = require("./lib/LoveManager.js");
var ProgressManager = require("./lib/ProgressManager.js");
var PermissionChecker = require("./lib/PermissionChecker.js");
var PermissionFetcher = require("./lib/PermissionFetcher.js");
var ScrobblingManager = require("./lib/ScrobblingManager.js");
var SkipManager = require("./lib/SkipManager.js");
var SkippersDao = require("./lib/SkippersDao.js");
var Socket = require("./lib/Socket.js");
var Spotify = require("./lib/Spotify.js");
var SpotifyRequestIssuer = require("./lib/SpotifyRequestIssuer.js");
var UserActivityFlagManager = require("./lib/UserActivityFlagManager.js");
var UserDao = require("./lib/UserDao.js");
var VotingManager = require("./lib/VotingManager.js");

// Instances
var config = require("./config.js");

// DI
var logger = new Logger();
var spotify = new Spotify(logger);
var permissionFetcher = new PermissionFetcher(config);
var permissionChecker = new PermissionChecker(permissionFetcher);
var dataStore = new DataStore(logger);
var lastfmClient = new LastfmClient(config, logger, dataStore);
var userDao = new UserDao(dataStore, lastfmClient);
var skippersDao = new SkippersDao(dataStore);
var socket = new Socket(userDao, permissionChecker, config);
var currentTrackDao = new CurrentTrackDao(dataStore, socket);
var chat = new Chat(socket, config);
var progressManager = new ProgressManager(socket);
var expressInternal = new ExpressInternal(config, chat, progressManager);
var expressExternal = new ExpressExternal(config, lastfmClient, userDao, chat, permissionChecker);
var externalHttpServer = new ExternalHttpServer(expressExternal, socket, config);
var votingManager = new VotingManager(chat, socket, dataStore);
var heartbeatManager = new HeartbeatManager(socket, chat, userDao);

// Nothing depends on those:

new Backend(dataStore, lastfmClient, spotify, logger);
new FrontendUpdater(socket, userDao, currentTrackDao, skippersDao, dataStore);
new SkipManager(socket, skippersDao, chat);
new ScrobblingManager(socket, userDao);
new LoveManager(socket, currentTrackDao, chat, lastfmClient);
new CurrentTrackChatUpdater(currentTrackDao, chat);
new SpotifyRequestIssuer(chat, socket, config);
new EndOfDayRequestManager(userDao, votingManager, socket);
new DiscoveryHourRequestManager(votingManager, socket, dataStore);
new UserActivityFlagManager(userDao, chat, socket);

// Start
expressInternal.start();
expressExternal.start();
externalHttpServer.start();
heartbeatManager.start();
