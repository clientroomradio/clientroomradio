var config = {
    "scrobbleToHost": false,
    "api_key": "<API_KEY>",
    "secret": "<SECRET>",
    "sk": "<SK>",
    "host": "localhost",
    "chatBacklogLength": 100,
    "port": 3000,
    "notAllowedInUrl": "http://www.websitepulse.com/blog/uploads/2013/02/Access-Denied_finalll.jpg",
    "spotifyRequestUrl": "http://localhost:3002/request",
    "discoveryHourRequestUrl": "http://localhost:3002/discovery",
    "external": {
        "api_key": "<API_KEY>",
        "name": "Client Room Radio",
        "stream": "/stream.mp3",
        "listeningHistory": "http://www.last.fm/user/clientroom"
    }
};

// for nodejs
module.exports = config;
