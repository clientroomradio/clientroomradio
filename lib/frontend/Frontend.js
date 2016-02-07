module.exports = function(dataStore) {
    // Classes
    var Chat = require("./Chat.js");
    var CurrentTrackChatUpdater = require("./CurrentTrackChatUpdater.js");
    var CurrentTrackDao = require("./CurrentTrackDao.js");
    var EndOfDayRequestManager = require("./EndOfDayRequestManager.js");
    var DiscoveryHourRequestManager = require("./DiscoveryHourRequestManager.js");
    var ExpressExternal = require("./ExpressExternal.js");
    var ExpressInternal = require("./ExpressInternal.js");
    var ExternalHttpServer = require("./ExternalHttpServer.js");
    var FrontendUpdater = require("./FrontendUpdater.js");
    var HeartbeatManager = require("./HeartbeatManager.js");
    var LastfmClient = require("./LastfmClient.js");
    var LoveManager = require("./LoveManager.js");
    var ProgressManager = require("./ProgressManager.js");
    var PermissionChecker = require("./PermissionChecker.js");
    var PermissionFetcher = require("./PermissionFetcher.js");
    var ScrobblingManager = require("./ScrobblingManager.js");
    var SkipManager = require("./SkipManager.js");
    var SkippersDao = require("./SkippersDao.js");
    var Socket = require("./Socket.js");
    var SpotifyRequestIssuer = require("./SpotifyRequestIssuer.js");
    var UserActivityFlagManager = require("./UserActivityFlagManager.js");
    var UserDao = require("./UserDao.js");
    var VotingManager = require("./VotingManager.js");

    // Instances
    var config = require("../../config.js");

    // DI
    var lastfmClient = new LastfmClient(config);
    var permissionFetcher = new PermissionFetcher(config);
    var permissionChecker = new PermissionChecker(permissionFetcher);
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

    // Nothing depends on those:
    new FrontendUpdater(socket, userDao, currentTrackDao, skippersDao, dataStore);
    new SkipManager(socket, skippersDao, chat);
    new ScrobblingManager(socket, userDao);
    new LoveManager(socket, currentTrackDao, chat, lastfmClient);
    var heartbeatManager = new HeartbeatManager(socket, chat, userDao);
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
};
