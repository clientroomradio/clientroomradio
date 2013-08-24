var config = {
  "api_key": "<API_KEY>",
  "secret": "<SECRET>",
  "sk": "<SK>",
  "host": "localhost",
  "frontendPort": 3000,
  "internalPort": 3001,
  "external": {
  	"name": "Client Room Radio",
  	"stream": "http://localhost:8080/stream.mp3"
  }
}

// for nodejs 
module.exports = config;