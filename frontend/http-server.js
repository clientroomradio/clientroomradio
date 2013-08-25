module.exports.start = function (config, rebus) {
	var express = require('express');
	var LastFmNode = require('lastfm').LastFmNode;
	var _ = require('underscore');
	var uuid = require('node-uuid');

	var currentTrack = {};
	var currentProgress = 0;

	var sockjs = require('sockjs').createServer();

	var app = express();
	var httpServer = require('http').createServer(app);

	sockjs.installHandlers(httpServer , {prefix:'/sockjs'});

	var lastfm = new LastFmNode({
	  api_key: config.api_key, 
	  secret: config.secret
	});

	app.use(express.static(__dirname + '/static'));
	app.use(express.cookieParser());

	app.get('/logout', function(req, res) {
		var username = getUsernameForSessionToken(req.cookies.session);

		res.clearCookie('session');
		res.clearCookie('username');

		var users = rebus.value.users || {};
		delete users[username];
		rebus.publish('users', users);

		res.redirect('/');
	});

	app.get('/login', function(req, res) {
		var token = req.param('token');

		lastfm.session({ token:token}).on('success', function(session) {
			var sessionKey = uuid.v4();


			res.cookie('session', sessionKey);
			res.cookie('username', session.user);

			var users = rebus.value.users || {};
			users[session.user] = {
				'session': sessionKey,
				'sk': session.key, 
				'scrobbling': true,
				'active': true
			};
			rebus.publish('users', users);

			res.redirect('/');
		});
	});

	function getUsernameForSessionToken(session) {
		var users = rebus.value.users || {};
		var result;
		_.each(users, function(data, username) {
			if (data.session == session) {
				result = username;
				
			}
		});
		return result;
	}

	app.get('/config.js', function(req, res) {
		var username = req.cookies.username;

		res.header('Content-Type', 'application/javascript');
		res.send('var config = ' + JSON.stringify(config.external) + "; var loggedInAs =" + JSON.stringify(username) + ";");
	});

	httpServer.listen(config.frontendPort);
	console.log('Listening externally on port %s', config.frontendPort);

	// Internal port

	var appInternal = express();
	appInternal.use(express.bodyParser());

	appInternal.post('/progress', function(req, res){
		currentProgress = req.body.progress;
		events.emit('updateProgress');
	    res.end();
	});

	appInternal.post('/chat', function(req, res){
		console.log("message:", req.body.message);
	    res.end();
	});

	appInternal.listen(config.internalPort);
	console.log('Listening internally on port %s', config.internalPort);

	// events
	var EventEmitter = require("events").EventEmitter;
	var events = new EventEmitter();
	events.setMaxListeners(0);

	// rebus
	rebus.value.currentTrack;
 	var currentTrackNotification = rebus.subscribe('currentTrack', function(newCurrentTrack) {
 		currentTrack = newCurrentTrack;
 		events.emit('newTrack');
  	});
  	var usersNotification = rebus.subscribe('users', function() {
 		events.emit('usersChange');
  	});
  	var skippersNotification = rebus.subscribe('skippers', function() {
 		events.emit('skippersChange');
  	});



	// sockjs
	var eventsClass = require('events');
	var eventEmitter = new eventsClass.EventEmitter();

	sockjs.on('connection', function(conn) {

		conn.once('data', function(session) {
			var username = getUsernameForSessionToken(session);
			var userData = rebus.value.users[username];
		
			console.log('connected to %s', username);

			var send = function(type, data) {
				conn.write(JSON.stringify({type: type, data: data}));
			}

			var sendNewTrack = function() {
				send('newTrack', currentTrack);
			};
			events.addListener('newTrack', sendNewTrack);
			sendNewTrack();

			var sendUsers = function() {
				// shitty deep clone to filter session keys out
				var users = JSON.parse(JSON.stringify(rebus.value.users));
				
				_.each(users, function(data, name){ 
					delete(data.sk);
					delete(data.session);
				});
				send('users', users);
			};
			events.addListener('usersChange', sendUsers);
			sendUsers();

			var updateProgress = function() {
				send('progress', currentProgress);
			};
			events.addListener('updateProgress', updateProgress);
			updateProgress();

			var sendSkippers = function() {
				send('skippers', rebus.value.skippers);
			};
			events.addListener('skippersChange', sendSkippers);
			sendSkippers();

			conn.on('data', function(dataAsString) {
				var payload = JSON.parse(dataAsString);
				var type = payload.type;
				var data = payload.data;
				if (type == 'chatMessage' && username) {
					eventEmitter.emit('broadcast', 'chat', data);
					return;	
				}
				if (type == 'skip' && username) {
					
					var skippers = rebus.value.skippers;
					var alreadySkipped = false;
					for(var i=0, len=skippers.length; i < len; i++){
						var user = skippers[i];
						if (user == username) {
							alreadySkipped = true;
						}
					}
					if (alreadySkipped) {
						eventEmitter.emit('broadcast', 'chat', {
							system: 'alreadySkipped',
							user: username
						});
					} else {
						skippers.push(username);
						rebus.publish('skippers', skippers );
						eventEmitter.emit('broadcast', 'chat', {
							system: 'skip',
							text: data.text,
							user: username
						});
					}
					
					return;	
				}
				if (type == 'love' && username) {

					var request = lastfm.request("track.love", {
						track: currentTrack.title,
						artist: currentTrack.creator,
						sk: userData.sk,
						handlers: {
							success: function(lfm) {
								console.log("loving for:", username);
							},
							error: function(error) {
								console.log("Error: " + error.message);
							}
						}
					});

					eventEmitter.emit('broadcast', 'chat', {
						system: 'love',
						user: username
					});
					return;
				}
				if (type == 'unlove' && username) {
					
					var request = lastfm.request("track.unlove", {
						track: currentTrack.title,
						artist: currentTrack.creator,
						sk: userData.sk,
						handlers: {
							success: function(lfm) {
								console.log("unloving for:", username);
							},
							error: function(error) {
								console.log("Error: " + error.message);
							}
						}
					});

					eventEmitter.emit('broadcast', 'chat', {
						system: 'unlove',
						user: username
					});

					return;
				}
				if (type == 'scrobbleStatus' && username) {

					var users = rebus.value.users || {};
					users[username].scrobbling = data?true:false;
					rebus.publish('users', users);

					eventEmitter.emit('broadcast', 'chat', {
						system: data?'scrobbleOn':'scrobbleOff',
						user: username
					});

					return;
				}

				console.log("received", data);
			});

			eventEmitter.on('broadcast', send);

		    conn.on('close', function() {
		    	eventEmitter.removeListener('broadcast', send);
		    	console.log('disconnects');
		    });
		});
	});
}