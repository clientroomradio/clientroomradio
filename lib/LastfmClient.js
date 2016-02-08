"use strict";

module.exports = function(config, logger, dataStore) {
    var that = this;

    var LastFmNode = require("lastfm").LastFmNode;
    var request = require("request");

    var playedTracks = dataStore.read("playedTracks") || [];

    dataStore.record(that, "playedTracks", "playedTracks");

    var lastfm = new LastFmNode({
        "api_key": config.api_key,
        "secret": config.secret,
        "useragent": "clientroomradio/v0.1 Client Room Radio"
    });

    that.login = function(token, callback) {
        lastfm.session({token: token}).on("success", function (session) {
            // Make it an "err, data"-style callback
            callback(null, session);
        });
    };

    that.setLoveStatus = function(user, track, loveFlag, callback) {
        var method = loveFlag ? "track.love" : "track.unlove";
        lastfm.request(method, {
            track: track.title,
            artist: track.creator,
            sk: user.sk,
            handlers: {
                success: function(/*lfm*/) {
                    callback(null);
                },
                error: function(error) {
                    callback(error.message);
                }
            }
        });
    };

    that.userGetInfo = function(username, callback) {
        lastfm.request("user.getInfo", {
            user: username,
            handlers: {
                success: function(lfm) {
                    callback(null, lfm);
                },
                error: function(error) {
                    callback(error.message, "");
                }
            }
        });
    };

    function doUpdateNowPlaying(username, sessionKey, track) {
        lastfm.request("track.updateNowPlaying", {
            track: track.name,
            artist: track.artists[0].name,
            duration: track.duration,
            sk: sessionKey,
            handlers: {
                success: function(lfm) {
                    logger.winston.info("Updated now playing for:", username, lfm);
                },
                error: function(error) {
                    logger.winston.error("doUpdateNowPlaying", error.message);
                }
            }
        });
    }

    function getTrackIdFromURI(uri) {
        var urlSplit = uri.split("/");
        return urlSplit[urlSplit.length - 1];
    }

    function getTrackIdFromPlaylistTrack(track) {
        var spotifyPlayLinks = track.playlinks.filter(function (playlink) {
            return playlink.affiliate === "spotify";
        });

        if (spotifyPlayLinks.length > 0) {
            return getTrackIdFromURI(spotifyPlayLinks[0].url);
        }

        return track.artists[0].name + track.name;
    }

    function addPlayedTrack(track) {
        playedTracks.push({
            id: getTrackIdFromURI(track.identifier),
            timestamp: new Date().getTime()
        });

        that.emit("playedTracks", playedTracks);
    }

    that.updateNowPlaying = function(track, users) {
        addPlayedTrack(track);

        if (Object.keys(track).length !== 0) {
            // always scrobble to clientroom
            if (typeof config.scrobbleToHost === "undefined" || config.scrobbleToHost) {
                doUpdateNowPlaying("clientroom", config.sk, track);
            }

            Object.keys(users).forEach(function (username) {
                if ( !(!users[username].scrobbling || !users[username].active) ) {
                    doUpdateNowPlaying(users[username], users[username].sk, track);
                }
            });
        }
    };

    function doScrobble(username, sessionKey, track) {
        var options = {
            "track[0]": track.name,
            "artist[0]": track.artists[0].name,
            "timestamp[0]": Math.round(track.timestamp / 1000),
            "duration[0]": track.duration,
            sk: sessionKey,
            "chosenByUser[0]": "0",
            handlers: {
                success: function(lfm) {
                    logger.winston.info("Scrobbled track for:", username, lfm);
                },
                error: function(error) {
                    logger.winston.info("Scrobble error:" + error.message);
                }
            }
        };

        if (track.extension.hasOwnProperty("streamid")) {
            options["streamid[0]"] = track.extension.streamid;
        }

        lastfm.request("track.scrobble", options);
    }

    that.scrobble = function(track, users, skippers) {
        if ( Object.keys(track).length !== 0 && new Date().getTime() - track.timestamp > Math.round( (track.duration * 1000) / 2 ) ) {
            // we've listened to more than half the song
            if (typeof config.scrobbleToHost === "undefined" || config.scrobbleToHost) {
                doScrobble("clientroom", config.sk, track);
            }

            Object.keys(users).forEach(function (username) {
                if ( !(!users[username].scrobbling || !users[username].active)
                        && skippers.indexOf(username) === -1 ) {
                    // the user hasn't voted to skip this track
                    doScrobble(users[username], users[username].sk, track);
                }
            });
        }
    };

    that.trackGetAlbumArt = function(track) {
        lastfm.request("track.getInfo", {
            track: track.name,
            artist: track.artists[0].name,
            handlers: {
                success: function(lfm) {
                    if (typeof lfm.track.album !== "undefined") {
                        track.image = lfm.track.album.image[1]["#text"];
                    }
                }
            }
        });
    };

    that.getContext = function(track, users, callback) {
        track.context = {};

        Object.keys(users).forEach(function (username) {
            lastfm.request("track.getInfo", {
                track: track.name,
                artist: track.artists[0].name,
                username: username,
                handlers: {
                    success: function(lfm) {
                        logger.winston.info("getContext", username, track.name, lfm.track.userplaycount);
                        if (typeof lfm.track.album !== "undefined") {
                            track.image = lfm.track.album.image[2]["#text"];
                        }
                        if (typeof lfm.track.userplaycount !== "undefined") {
                            track.context[username] = track.context[username] || {"username": username};
                            track.context[username].userplaycount = lfm.track.userplaycount;
                            track.context[username].userloved = lfm.track.userloved;
                        }
                        callback(track);
                    },
                    error: function(error) {
                        logger.winston.error("getContext:track.getInfo", error.message);
                        callback(track);
                    }
                }
            });
        });
    };

    /*
    function getRqlStationUrl(sortedUsers) {
        var rqlString = "";

        for ( var user in sortedUsers ) {
            if (rqlString.length === 0) {
                rqlString = util.format("%s", "user:" + sortedUsers[user]);
            } else {
                rqlString = util.format("%s or %s", rqlString, "user:" + sortedUsers[user]);
            }
        }

        // and some tags?
        if (tags.length > 0) {
            // We have some tags so use them!
            var tagString = "";

            for (var tag in tags) {
                if (tagString.length === 0) {
                    tagString = util.format("tag:\"%s\"", tags[tag]);
                } else {
                    tagString = util.format("%s or tag:\"%s\"", tagString, tags[tag]);
                }
            }

            rqlString = util.format("(%s) and (%s)", rqlString, tagString);
        }

        return "lastfm://rql/" + new Buffer(rqlString).toString("base64");
    }
    */

    function getStandardStationUrl(users) {
        var stationUsers = "";

        if (config.stationUsersOverride) {
            stationUsers = config.stationUsersOverride;
        } else {
            stationUsers = users.join(",");
        }

        return "http://www.last.fm/player/station/user/" + stationUsers + "/library";
    }

    that.alphabetSort = function(array) {
        return array.sort();
    };

    that.shuffle = function(array) {
        var counter = array.length, temp, index;

        // While there are elements in the array
        while (counter > 0) {
            // Pick a random index
            index = Math.floor(Math.random() * counter);

            // Decrease counter by 1
            counter--;

            // And swap the last element with it
            temp = array[counter];
            array[counter] = array[index];
            array[index] = temp;
        }

        return array;
    };

    that.getStationUrl = function(users, sortMethod) {
        var sortedUsers = sortMethod(users);
        var stationUrl = getStandardStationUrl(sortedUsers);
        return stationUrl;
    };

    that.getPlaylist = function(users, callback) {
        var stationUrl = that.getStationUrl(users, that.shuffle);

        request.get(stationUrl, function (error, response, body) {
            if (error) {
                logger.winston.error("getPlaylist error", error.message);
                logger.winston.info("Try again in one second...");
                setTimeout(that.getPlaylist, 1000, users, callback);
            } else if (response.statusCode !== 200) {
                logger.winston.error("getPlaylist not 200", response.statusCode);
                logger.winston.info("Try again in one second...");
                setTimeout(that.getPlaylist, 1000, users, callback);
            } else {
                // Get rid of any played tracks more than one day old
                playedTracks = playedTracks.filter(function (playedTrack) {
                    return playedTrack.timestamp >= new Date().getTime() - (86400000);
                });

                that.emit("playedTracks", playedTracks);

                var lfm = JSON.parse(body);

                // remove any playlist tracks that have been played before
                lfm.playlist = lfm.playlist.filter(function (playlistTrack) {
                    return playedTracks.filter(function (playedTrack) {
                        return playedTrack.id === getTrackIdFromPlaylistTrack(playlistTrack);
                    }).length === 0;
                });

                callback(lfm);
            }
        });
    };
};

require("util").inherits(module.exports, require("events").EventEmitter);
