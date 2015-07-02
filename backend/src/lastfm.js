"use strict";

module.exports = function(config, winston, redis) {
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
            album: track.album,
            track: track.title,
            artist: track.creator,
            duration: (track.duration / 1000),
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
        return track.creator + track.title;
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
            "album[0]": track.album,
            "track[0]": track.title,
            "artist[0]": track.creator,
            "timestamp[0]": Math.round(track.timestamp / 1000),
            "duration[0]": Math.round(track.duration / 1000),
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
        if ( !_.isEmpty(track) && new Date().getTime() - track.timestamp > Math.round( track.duration / 2 ) ) {
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
            track: track.title,
            artist: track.creator,
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
                track: track.title,
                artist: track.creator,
                username: user,
                handlers: {
                    success: function(lfm) {
                        winston.info("getContext", user, track.title, lfm.track.userplaycount);
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
                artist: track.creator,
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

        for (var user in users) {
            if ( stationUsers.length > 0 ) {
                stationUsers += "," + users[user];
            } else {
                stationUsers += users[user];
            }
        }

        return "lastfm://users/" + stationUsers + "/personal";
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

    that.radioTune = function(users, callback) {
        var stationUrl = that.getStationUrl(users, that.shuffle);

        winston.info("radioTune", stationUrl);

        if ( !_.isEmpty(users) ) {
            lastfm.request("prototype.tune", {
                station: stationUrl,
                sk: config.sk,
                signed: true,
                write: true,
                handlers: {
                    success: callback,
                    error: function(error) {
                        winston.error("radioTune", error.message);
                        winston.info("Try again in one second...");
                        setTimeout(that.radioTune, 1000, users, callback);
                    }
                }
            });
        }
    };

    that.getPlaylist = function(callback) {
        lastfm.request("prototype.getplaylist", {
            sk: config.sk,
            signed: true,
            handlers: {
                success: function(xspf) {
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

                        for (var i = xspf.playlist.trackList.track.length - 1; i >= 0; i--) {
                            if (_.contains(_.keys(playedTracks), getTrackId(xspf.playlist.trackList.track[i]))) {
                                var removedTrack = xspf.playlist.trackList.track.splice(i, 1);
                                winston.info("removedTrack", removedTrack.title);
                            }
                        }

                        callback(xspf);
                    });
                },
                error: function(error) {
                    winston.error("getPlaylist", error.message);
                    winston.info("Try again in one second...");
                    setTimeout(that.getPlaylist, 1000, callback);
                }
            }
        });
    };
};

require("util").inherits(module.exports, require("events").EventEmitter);
