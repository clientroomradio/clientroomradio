module.exports = function(config, chat, progressManager) {
	var that = this;
	var express = require('express');
	var app;

	that.start = function() {
		app = express();
		app.use(express.bodyParser());

		app.post('/progress', function(req, res){
			progressManager.updateProgress(req.body.progress);
		    res.end();
		});

		/*app.post('/chat', function(req, res){
			console.log("message:", req.body.message);
		    res.end();
		});*/

		app.listen(config.internalPort);
		console.log('Listening internally on port %s', config.internalPort);
	}

}