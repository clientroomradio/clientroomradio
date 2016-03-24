var config = {
  radioname: "Client Room Radio",
  scrobbleToHost: false,
  whitelist: true,
  lfm: {
    api_key: "<API_KEY>",
    secret: "<SECRET>",
    sk: "<SK>"
  },
  spotify: {
    username: "<SPOTIFY_USERNAME>",
    password: "<SPOTIFY_PASSWORD>"
  },
  host: "localhost",
  chatBacklogLength: 100,
  port: 3000,
  stationOverride: null,
  noRepeatDays: 10
};

// for nodejs
module.exports = config;
