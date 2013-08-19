module.exports.start = function (config, rebus) {
	var express = require('express');
	var LastFmNode = require('lastfm').LastFmNode;

	var currentTrack = {};

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
		res.clearCookie('username');
		res.clearCookie('sk');
		res.redirect('/');
	});

	app.get('/login', function(req, res) {
		var token = req.param('token');

		lastfm.session({ token:token}).on('success', function(session) {
			res.cookie('username', session.user);
			res.cookie('sk', session.key);

			var users = rebus.value.users || {};
			users[session.user] = {'sk': session.key};
			rebus.publish('users', users);

			res.redirect('/');
		});
	});

	app.get('/config.js', function(req, res) {
		var username = req.cookies.username;

		res.header('Content-Type', 'application/javascript');
		res.send('var config = ' + JSON.stringify(config) + "; var loggedInAs =" + JSON.stringify(username) + ";");
	});

	httpServer.listen(config.port);

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
		
		console.log('connected to ...')

		var send = function(type, data) {
			conn.write(JSON.stringify({type: type, data: data}));
		}

		var sendNewTrack = function() {
			send('newTrack', currentTrack);
		};
		events.addListener('newTrack', sendNewTrack);
		sendNewTrack();

		var sendUsers = function() {
			send('users', rebus.value.users);
		};
		events.addListener('usersChange', sendUsers);
		sendUsers();

		var sendSkippers = function() {
			send('skippers', rebus.value.skippers);
		};
		events.addListener('skippersChange', sendSkippers);
		sendSkippers();

		conn.on('data', function(dataAsString) {
			var payload = JSON.parse(dataAsString);
			var type = payload.type;
			var data = payload.data;
			if (type == 'chatMessage') {
				eventEmitter.emit('broadcast', 'chat', data);
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
}