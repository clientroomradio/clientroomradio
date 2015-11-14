"use strict";

module.exports = function(config, winston, redis, request) {
    var that = this;

    var _ = require("underscore");
    var LastFmNode = require("lastfm").LastFmNode;
    var util = require("util");

    var mDiscoveryHourStart = new Date(0);
    var tags = [];

    var lastfm = new LastFmNode({
        api_key: config.api_key,
        secret: config.secret,
        useragent: "clientroomradio/v0.1 Client Room Radio"
    });

    function doUpdateNowPlaying(username, sessionKey, track) {
        lastfm.request("track.updateNowPlaying", {
            track: track.name,
            artist: track.artists[0].name,
            duration: track.duration,
            sk: sessionKey,
            handlers: {
                success: function(lfm) {
                    winston.info("Updated now playing for:", username, lfm);
                },
                error: function(error) {
                    winston.error("doUpdateNowPlaying", error.message);
                }
            }
        });
    }

    function getTrackId(track) {
        return track.artists[0].name + track.name;
    }

    function addPlayedTrack(track) {
        redis.get("playedTracks", function (getErr, playedTracks) {
            winston.info("addPlayedTrack", getErr);

            playedTracks[getTrackId(track)] = {"timestamp": new Date().getTime()};

            redis.set("playedTracks", playedTracks, function (setErr) {
                winston.info("addPlayedTrack", "playedTracks set", setErr);
            });
        });
    }

    that.updateNowPlaying = function(track, users) {
        addPlayedTrack(track);

        if ( !_.isEmpty(track) ) {
            // always scrobble to clientroom
            if (typeof config.scrobbleToHost === "undefined" || config.scrobbleToHost) {
                doUpdateNowPlaying("clientroom", config.sk, track);
            }

            _.each(users, function(data, user) {
                if ( !(!data.scrobbling || !data.active) ) {
                    doUpdateNowPlaying(user, data.sk, track);
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
                    winston.info("Scrobbled track for:", username, lfm);
                },
                error: function(error) {
                    winston.info("Scrobble error:" + error.message);
                }
            }
        };

        if ( _.has( track.extension, "streamid") ) {
            options["streamid[0]"] = track.extension.streamid;
        }

        lastfm.request("track.scrobble", options);
    }

    that.setTags = function(newTags) {
        tags = newTags;
    };

    that.scrobble = function(track, users, skippers) {
        if ( !_.isEmpty(track) && new Date().getTime() - track.timestamp > Math.round( (track.duration * 1000) / 2 ) ) {
            // we've listened to more than half the song
            if (typeof config.scrobbleToHost === "undefined" || config.scrobbleToHost) {
                doScrobble("clientroom", config.sk, track);
            }

            _.each(users, function(data, user) {
                if ( !(!data.scrobbling || !data.active)
                        && !_.contains(skippers, user) ) {
                    // the user hasn't voted to skip this track
                    doScrobble(user, data.sk, track);
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

        var finished = _.after(_.keys(users).length * 2, callback);

        _.each(users, function(data, user) {
            lastfm.request("track.getInfo", {
                track: track.name,
                artist: track.artists[0].name,
                username: user,
                handlers: {
                    success: function(lfm) {
                        winston.info("getContext", user, track.name, lfm.track.userplaycount);
                        if (typeof lfm.track.album !== "undefined") {
                            track.image = lfm.track.album.image[2]["#text"];
                        }
                        if (typeof lfm.track.userplaycount !== "undefined") {
                            track.context[user] = track.context[user] || {"username": user};
                            track.context[user].userplaycount = lfm.track.userplaycount;
                            track.context[user].userloved = lfm.track.userloved;
                        }
                        finished(track);
                    },
                    error: function(error) {
                        winston.error("getContext:track.getInfo", error.message);
                        finished(track);
                    }
                }
            });

            lastfm.request("artist.getInfo", {
                artist: track.artists[0].name,
                username: user,
                handlers: {
                    success: function(lfm) {
                        if (typeof lfm.artist !== "undefined"
                                && typeof lfm.artist.stats !== "undefined"
                                && lfm.artist.stats.hasOwnProperty("userplaycount")
                                && lfm.artist.stats.userplaycount === 0) {
                            track.context[user] = track.context[user] || {"username": user};
                            track.context[user].artistInLibrary = true;
                        }
                        finished(track);
                    },
                    error: function(error) {
                        winston.error("getContext:artist.getInfo", error.message);
                        finished(track);
                    }
                }
            });
        });
    };

    that.setDiscoveryHourStart = function(discoveryHourStart) {
        mDiscoveryHourStart = discoveryHourStart;
    };

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

        if (new Date().getTime() - mDiscoveryHourStart < 3600000) {
            // it's discovery hour!
            rqlString = util.format("%s %s", rqlString, "opt:discovery|true");
        }

        return "lastfm://rql/" + new Buffer(rqlString).toString("base64");
    }

    function getStandardStationUrl(users) {
        var stationUsers = "";

        if (config.stationUsersOverride) {
            stationUsers = config.stationUsersOverride;
        } else {
            for (var user in users) {
                if ( stationUsers.length > 0 ) {
                    stationUsers += "," + users[user];
                } else {
                    stationUsers += users[user];
                }
            }
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
        var sortedUsers = sortMethod(_.keys(users));
        var stationUrl = getStandardStationUrl(sortedUsers);
        return stationUrl;
    };

    that.getPlaylist = function(users, callback) {
        var stationUrl = that.getStationUrl(users, that.shuffle);

        request.get(stationUrl, function (error, response, body) {
            if (error || response.statusCode !== 200) {
                winston.error("getPlaylist", error.message);
                winston.info("Try again in one second...");
                setTimeout(that.getPlaylist, 1000, users, callback);
            } else {
                redis.get("playedTracks", function (getRrr, playedTracks) {
                    winston.info("got playlist", getRrr);

                    // Get rid of any tracks more than one day old
                    for (var playedTrack in playedTracks) {
                        if (playedTracks[playedTrack].timestamp < new Date().getTime() - (86400000)) {
                            // the timestamp is older than a day so remove the track
                            delete playedTracks[playedTrack];
                        }
                    }

                    redis.set("playedTracks", playedTracks, function (setErr) {
                        winston.info("got playlist: playedTracks set", setErr);
                    });

                    var lfm = JSON.parse(body);

                    // remove any tracks that have been played before
                    for (var i = lfm.playlist.length - 1; i >= 0; i--) {
                        if (_.contains(_.keys(playedTracks), getTrackId(lfm.playlist[i]))) {
                            var removedTrack = lfm.playlist.splice(i, 1);
                            winston.info("removedTrack", removedTrack.title);
                        }
                    }

                    callback(lfm);
                });
            }
        });
    };
};

require("util").inherits(module.exports, require("events").EventEmitter);
