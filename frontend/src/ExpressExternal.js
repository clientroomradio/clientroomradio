module.exports = function(config, lastfmClient, userDao, chat) {
	var that = this;
	var express = require('express');
	var uuid = require('node-uuid');

	var app;

	that.start = function() {
		app = express();
		app.use(express.static(__dirname + '/../static'));
		app.use(express.cookieParser());

		app.get('/logout', function(req, res) {
			var user = userDao.getUserBySession(req.cookies.session);
			res.clearCookie('session');
			if (user) {
				chat.userLeft(user);
				userDao.removeUser(user);
			} 
			res.redirect('/');
		});

		app.get('/login', function(req, res) {
			var token = req.param('token');
			lastfmClient.login(token, function(err, session) {
				if (err) {
					console.log('ERR: %s', err);
				} else {
					console.log(session);
					var sessionId = uuid.v4();
					res.cookie('session', sessionId);
					var user = userDao.addUser(session.user, sessionId, session.key);
					chat.userJoined(user);
					res.redirect('/');
				}
			});
		});

		app.get('/config.js', function(req, res) {
			res.header('Content-Type', 'application/javascript');
			var user = userDao.getUserBySession(req.cookies.session);
			if (user) {
				res.send('var config = ' + JSON.stringify(config.external) + "; var loggedInAs =" + JSON.stringify(user.username) + ";");
			} else {
				res.send('var config = ' + JSON.stringify(config.external) + "; var loggedInAs = null;");
			}
		});

		
	}

	that.getApp = function() {
		return app;
	}	
}