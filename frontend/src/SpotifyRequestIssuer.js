module.exports = function(chat, socket, config) {
	var that = this;

	var request = require('request');

	socket.on('request', function(user, query){
		var payload = {
			username: user.username,
			request: query
		};

		request.post(config.spotifyRequestUrl, payload, function (error, response, body) {
	    	if (error) {
	    		console.log("ERR", error)
	    	} else if (response.statusCode != 200) {
	    		console.log("STATUS CODE != 200: ", response.body);
	    	} 
	    });

		chat.spotifyRequest(user, query);
	});
}