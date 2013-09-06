var config = {
  "api_key": "<API_KEY>",
  "secret": "<SECRET>",
  "sk": "<SK>",
  "host": "localhost",
  "frontendPort": 3000,
  "internalPort": 3001,
  "external": {
  	"api_key": "<API_KEY>",
  	"name": "The Client Room Radio",
  	"stream": "http://www.clientroomradio.com:8080/stream.mp3"
  }
}

// for nodejs 
module.exports = config;