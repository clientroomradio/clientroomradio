#!/usr/bin/env node

"use strict";

var ArgumentParser = require("argparse").ArgumentParser;
var LastFmNode = require("lastfm").LastFmNode;
var getChar = require("cli-interact").getChar;
var fs = require("fs");
var path = require("path");

var parser = new ArgumentParser({
  version: "0.0.1",
  addHelp: true,
  description: "Client Room Radio Setup"});
parser.addArgument(
  ["lfmApiKey"],
  {help: "The Last.fm api key for the hosting user"});
parser.addArgument(
  ["lfmApiSecret"],
  {help: "The Last.fm api secret for the hosting user"});
parser.addArgument(
  ["spUsername"],
  {help: "The Spotify Premium account username for audio"});
parser.addArgument(
  ["spPassword"],
  {help: "The Spotify Premium account password for audio"});
var args = parser.parseArgs();

var lastfm = new LastFmNode({
  api_key: args.lfmApiKey, // eslint-disable-line
  secret: args.lfmApiSecret
});

lastfm.request("auth.getToken", {
  handlers: {
    success: getTokenData => {
      var token = getTokenData.token;
      var prompt = `
        Press any key after authorizing the host user at the following url:\n
        http://www.last.fm/api/auth?api_key=${args.lfmApiKey}&token=${token}`;

      // wait for the user to press a button
      // the token will expire if we check prematurely
      getChar(prompt, "", true);

      lastfm.request("auth.getSession", {
        token: token,
        handlers: {
          success: getSessionData => {
            var sk = getSessionData.session.key;
            console.log("We got a session key:", sk);

            var configRelativePath = "../config/config.default.js";
            var configFilename = path.join(__dirname, configRelativePath);
            var config = fs.readFileSync(configFilename).toString();
            config = config.replace(/<API_KEY>/g, args.lfmApiKey)
              .replace(/<SECRET>/g, args.lfmApiSecret)
              .replace(/<SK>/g, sk)
              .replace(/<SPOTIFY_USERNAME>/g, args.spUsername)
              .replace(/<SPOTIFY_PASSWORD>/g, args.spPassword);

            fs.writeFileSync("/etc/crr/config.js", config);

            console.log("Done - config file written");
          },
          error: error => {
            console.error("not logged in", error);
          }
        }
      });
    },
    error: error => {
      console.error("Error", error);
    }
  }
});
