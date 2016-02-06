"use strict";

var LastFmNode = require("lastfm").LastFmNode;
var fs = require("fs");
var path = require("path");

if (process.argv.length < 4) {
    console.log("Usage: setup.js <lastfm_api_key> <lastfm_api_secret> [<spotify_username> <spotify_password>]");
} else {
      var apiKey = process.argv[2];
      var secret = process.argv[3];

    if (process.argv.length === 6) {
        // spotify details have been provided
        var Spotify = require("./spotify.js");
        var spotify = new Spotify(console);

        var spUsername = process.argv[4];
        var spPassword = process.argv[5];
        spotify.login(spUsername, spPassword);
        spotify.once("login", function (loginErr) {
            console.info("recieved login", loginErr);

            spotify.logout();
            spotify.once("logout", function (logoutErr) {
                // Don't do anything, we just needed to wait for it to happen
                console.log("Recieved logout", logoutErr);
            });
        });
    }

    var lastfm = new LastFmNode({
        "api_key": apiKey,
        "secret": secret
    });

    lastfm.request("auth.getToken", {
        handlers: {
            success: function(getTokenData) {
                var token = getTokenData.token;
                console.log("Please go to this URL and authorize the app:");
                console.log("http://www.last.fm/api/auth/?api_key=%s&token=%s", apiKey, token);
                console.log("Afterwards please check this terminal again...");

                process.stdin.once("data", function () {
                    lastfm.request("auth.getSession", {
                        token: token,
                        handlers: {
                            success: function(getSessionData) {
                                var sk = getSessionData.session.key;
                                console.log("We got a session key:", sk);

                                var config = fs.readFileSync(path.join(__dirname, "../../config.default.js")).toString();
                                config = config.replace(/<API_KEY>/g, apiKey)
                                    .replace(/<SECRET>/g, secret)
                                    .replace(/<SK>/g, sk);
                                fs.writeFileSync(path.join(__dirname, "../../config.js"), config);

                                console.log("Done - config file written");
                            },
                            error: function(error) {
                                console.error("not logged in", error);
                            }
                        }
                    });
                });
            },
            error: function(error) {
                console.error("Error", error);
            }
        }
    });
}



