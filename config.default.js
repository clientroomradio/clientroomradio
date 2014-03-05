var config = {
  "scrobbleToHost": false,
  "api_key": "<API_KEY>",
  "secret": "<SECRET>",
  "sk": "<SK>",
  "host": "localhost",
  "frontendPort": 3000,
  "internalPort": 3001,
  "backendPort": 3002,
  "lastFmGroup": "Client Room Radio",
  "notAllowedInUrl": "http://www.last.fm/group/Client+Room+Radio",
  "spotifyRequestUrl": "http://localhost:3002/request",
  "discoveryHourRequestUrl": "http://localhost:3002/discovery",
  "passphrase": "<SSL_PASSPHRASE>",
  "external": {
  	"api_key": "<API_KEY>",
  	"name": "The Client Room Radio",
  	"stream": "http://www.clientroomradio.com:8080/stream.mp3",
    "listeningHistory": "http://www.last.fm/user/clientroom"
  }
}

// for nodejs 
module.exports = config;