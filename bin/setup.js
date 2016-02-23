#!/usr/bin/env node

"use strict";

var ArgumentParser = require("argparse").ArgumentParser;
var LastFmNode = require("lastfm").LastFmNode;
var getChar = require("cli-interact").getChar;
var fs = require("fs");
var path = require("path");

var parser = new ArgumentParser({"version": "0.0.1", "addHelp": true, "description": "Client Room Radio Setup"});
parser.addArgument(["lfmApiKey"], {"help": "The Last.fm api key for the hosting user"});
parser.addArgument(["lfmApiSecret"], {"help": "The Last.fm api secret for the hosting user"});
parser.addArgument(["spUsername"], {"help": "The Spotify Premium account username for audio"});
parser.addArgument(["spPassword"], {"help": "The Spotify Premium account password for audio"});
var args = parser.parseArgs();

// spotify details have been provided
var Spotify = require("../lib/Spotify.js");
var spotify = new Spotify(console);

spotify.login(args.spUsername, args.spPassword);
spotify.once("login", function (loginErr) {
    console.info("recieved login", loginErr);

    spotify.logout();
    spotify.once("logout", function (logoutErr) {
        // Don't do anything, we just needed to wait for it to happen
        console.log("Recieved logout", logoutErr);
    });
});

var lastfm = new LastFmNode({
    "api_key": args.lfmApiKey,
    "secret": args.lfmApiSecret
});

lastfm.request("auth.getToken", {
    handlers: {
        success: function(getTokenData) {
            var token = getTokenData.token;
            var prompt = "Please go to this URL and authorize the app: " +
                            "http://www.last.fm/api/auth?api_key=" + args.lfmApiKey + "&token=" + token + "\n" +
                            "Afterwards please check this terminal again...";

            // wait for the user to press a button, the token will expire if we check prematurely
            getChar(prompt, "", true);

            lastfm.request("auth.getSession", {
                token: token,
                handlers: {
                    success: function(getSessionData) {
                        var sk = getSessionData.session.key;
                        console.log("We got a session key:", sk);

                        var config = fs.readFileSync(path.join(__dirname, "../config/config.default.js")).toString();
                        config = config.replace(/<API_KEY>/g, args.lfmApiKey)
                            .replace(/<SECRET>/g, args.lfmApiSecret)
                            .replace(/<SK>/g, sk);

                        fs.writeFileSync("/etc/crr/config.js", config);

                        console.log("Done - config file written");
                    },
                    error: function(error) {
                        console.error("not logged in", error);
                    }
                }
            });
        },
        error: function(error) {
            console.error("Error", error);
        }
    }
});
