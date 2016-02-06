var config = {
    "scrobbleToHost": false,
    "api_key": "<API_KEY>",
    "secret": "<SECRET>",
    "sk": "<SK>",
    "host": "localhost",
    "chatBacklogLength": 100,
    "frontendPort": 3000,
    "internalPort": 3001,
    "backendPort": 3002,
    "whitelistUrl": "https://docs.google.com/spreadsheets/d/1kgNgjC3ort37VpJxXeLr8tAYo9fLxGpOiAX48fiH6_s/pub?gid=0&single=true&output=csv",
    "notAllowedInUrl": "http://www.last.fm/group/Client+Room+Radio",
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
