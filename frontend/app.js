// Classes
var Chat = require('./src/Chat.js');
var CurrentTrackDao = require('./src/CurrentTrackDao.js');
var ExpressExternal = require('./src/ExpressExternal.js');
var ExpressInternal = require('./src/ExpressInternal.js');
var ExternalHttpServer = require('./src/ExternalHttpServer.js');
var FrontendUpdater = require('./src/FrontendUpdater.js');
var HeartbeatManager = require('./src/HeartbeatManager.js');
var LastfmClient = require('./src/LastfmClient.js');
var LoveManager = require('./src/LoveManager.js');
var ProgressManager = require('./src/ProgressManager.js');
var ScrobblingManager = require('./src/ScrobblingManager.js');
var SkipManager = require('./src/SkipManager.js');
var SkippersDao = require('./src/SkippersDao.js');
var Socket = require('./src/Socket.js');
var UserDao = require('./src/UserDao.js');

// Instances
var rebus = require('./src/rebus.js');
var config = require('../config.js');

rebus.onReady = function() {
	// DI
	var userDao = new UserDao(rebus);
	var skippersDao  = new SkippersDao(rebus);
	var currentTrackDao = new CurrentTrackDao(rebus);
	var socket = new Socket(userDao);
	var chat = new Chat(socket);
	var lastfmClient = new LastfmClient(config);
	var progressManager = new ProgressManager(socket);
	var expressInternal = new ExpressInternal(config, chat, progressManager);
	var expressExternal = new ExpressExternal(config, lastfmClient, userDao, chat);
	var externalHttpServer = new ExternalHttpServer(expressExternal, socket, config);

	// Nothing depends on those:
	var frontendUpdater = new FrontendUpdater(socket, userDao, currentTrackDao, skippersDao);
	var skipManager = new SkipManager(socket, skippersDao, chat);
	var scrobblingManager = new ScrobblingManager(socket, userDao, chat);
	var loveManager = new LoveManager(socket, currentTrackDao, chat, lastfmClient);
	var heartbeatManager = new HeartbeatManager(socket, userDao);

	// Start
	expressInternal.start();
	expressExternal.start();
	externalHttpServer.start();
}