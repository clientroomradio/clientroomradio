module.exports = function(chat, socket, config) {
	var that = this;

	var request = require('request');

	socket.on('request', function(user, track){
		var payload = {
			username: user.username,
			request: track.uri
		};

		request.post(config.spotifyRequestUrl, {json:payload}, function (error, response, body) {
	    	if (error) {
	    		console.log("ERR", error)
	    	} else if (response.statusCode != 200) {
	    		console.log("STATUS CODE != 200: ", response.body);
	    	} 
	    });

		chat.spotifyRequest(user, track);
	});
}