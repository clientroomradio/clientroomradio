var LastFmNode = require('lastfm').LastFmNode;
var readline = require('readline');
var fs = require('fs');

if (process.argv.length < 4) {
	console.log("Usage: setup.js <api_key> <secret> [<spotify_username> <spotify_password>]");
} else {
	var api_key = process.argv[2];
	var secret = process.argv[3];

  if (process.argv.length == 6) {
    // spotify details have been provided
    var sp = require('libspotify');

    var spSession = new sp.Session({
      cache_location: __dirname + "/spCache/",
      settings_location: __dirname + "/spSettings/",
      applicationKey: __dirname + '/spotify_appkey.key'
    });

    var spUsername = process.argv[4];
    var spPassword = process.argv[5];
    spSession.login( spUsername, spPassword, true );
    spSession.once('login', function(err) {
      if (err) console.log('There was an error logging into Spotify', err);
      else console.log('Logged in to Spotify');
      spSession.logout();
      spSession.once('logout', function(err) {
        console.log("logout");
        spSession.close();
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

                var config = fs.readFileSync('../config.default.js').toString();
                config = config.replace(/<API_KEY>/g, api_key)
                    .replace(/<SECRET>/g, secret)
                    .replace(/<SK>/g, sk);
                fs.writeFileSync('../config.js', config);

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



