var LastFmNode = require('lastfm').LastFmNode;
var readline = require('readline');
var fs = require('fs');

if (process.argv.length < 4) {
    console.log("Usage: setup.js <lastfm_api_key> <lastfm_api_secret> [<spotify_username> <spotify_password>]");
} else {
      var api_key = process.argv[2];
      var secret = process.argv[3];

    if (process.argv.length == 6) {
        // spotify details have been provided
        var Spotify = require('./src/spotify.js');
        var spotify = new Spotify(console);

        var spUsername = process.argv[4];
        var spPassword = process.argv[5];
        spotify.login(spUsername, spPassword);
        spotify.once('login', function(err) {
            spotify.logout();
            spotify.once('logout', function(err) {
                // Don't do anything, we just needed to wait for it to happen
                console.log('Recieved logout');
            });
        });
    }

    var lastfm = new LastFmNode({
        api_key: api_key,
        secret: secret
    });

    var request = lastfm.request("auth.getToken", {
        handlers: {
            success: function(data) {
                var token = data.token;
                console.log("Please go to this URL and authorize the app:");
                console.log("http://www.last.fm/api/auth/?api_key=%s&token=%s", api_key, token);
                console.log("Afterwards please check this terminal again...");

                function checkToken() {
                    lastfm.request("auth.getSession", {
                        token: token,
                        handlers: {
                            success: function(data) {
                                var sk = data.session.key;
                                console.log("We got a session key:", sk);

                                var config = fs.readFileSync(__dirname + '/../config.default.js').toString();
                                config = config.replace(/<API_KEY>/g, api_key)
                                    .replace(/<SECRET>/g, secret)
                                    .replace(/<SK>/g, sk);
                                fs.writeFileSync(__dirname + '/../config.js', config);

                                console.log("Done - config file written");
                            },
                            error: function(error) {
                                setTimeout(checkToken, 2000);
                            }
                        }
                    });
                }

                setTimeout(checkToken, 2000);
            },
            error: function(error) {
                console.log("Error: " + error.message);
            }
        }
    });
}



