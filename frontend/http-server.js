module.exports.start = function (config, rebus) {
	var express = require('express');
	var LastFmNode = require('lastfm').LastFmNode;

	var app = express();

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

	app.listen(config.port);
}