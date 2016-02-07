module.exports = function(chat, socket, config, logger) {
    var request = require("request");

    socket.on("request", function (user, track){
        var payload = {
            username: user.username,
            request: track.uri
        };

        request.post(config.spotifyRequestUrl, {json: payload}, function (error, response, body) {
            if (error) {
                logger.winston.error(body, error);
            } else if (response.statusCode !== 200) {
                logger.winston.error("STATUS CODE !== 200", response.body);
            }
        });

        chat.spotifyRequest(user, track);
    });
};
