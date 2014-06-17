module.exports = function(config, chat, progressManager) {
	var that = this;
	var express = require('express');
	var bodyParser = require('body-parser');
	var app;

	that.start = function() {
		app = express();
		app.use(bodyParser.json());

		app.post('/progress', function(req, res){
			progressManager.updateProgress(req.body.progress);
		    res.end();
		});

		app.all('/skip', function(req, res){
			chat.skipSuccessful();
		    res.end();
		});

		app.all('/requestcomplete', function(req, res){
			chat.spotifyRequestComplete(req.body.track);
		    res.end();
		});

		app.use(function(req, res){
			res.send(404);
		});

		app.listen(config.internalPort);
		console.log('Listening internally on port %s', config.internalPort);
	}

}