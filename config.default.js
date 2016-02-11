var config = {
    "scrobbleToHost": false,
    "api_key": "<API_KEY>",
    "secret": "<SECRET>",
    "sk": "<SK>",
    "host": "localhost",
    "chatBacklogLength": 100,
    "port": 3000,
    "logFile": "crr.winston.log",
    "external": {
        "api_key": "<API_KEY>",
        "name": "Client Room Radio",
        "stream": "/stream.mp3"
    }
};

// for nodejs
module.exports = config;
