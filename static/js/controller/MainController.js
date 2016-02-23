"use strict";

function MainController($scope, socket, notificationManager) {
    $scope.config = null;
    $scope.currentTrack = {};
    $scope.users = {};
    $scope.skippers = [];
    $scope.currentPositionInTrack = 0;
    $scope.loved = false;
    $scope.skipped = false;
    $scope.muted = false;
    $scope.bingo = false;

    $scope.login = function() {
        location.href = "http://www.last.fm/api/auth/?api_key=" + $scope.config.api_key + "&cb=" + $(location).attr("href") + "login.html";
    };

    function logout() {
        // clear our session so a refresh won't log them back in
        $.cookie("session", "");

        // clear the config so they think they're logged out
        $scope.config.loggedInAs = null;
        $scope.config.active = false;
        $scope.config.allowed = false;
        // clear everything else just in case
        $scope.loved = false;
        $scope.skipped = false;
        $scope.muted = false;
        $scope.bingo = false;
        $scope.$apply();
    }

    $scope.logout = function() {
        // they clicked logout so tell the backend
        socket.logout(); 
    };

    socket.disconnectedCallback.add(function (data) {
        logout();
    });

    $scope.love = function() {
        $scope.loved = true;
        socket.love();
    };

    $scope.unlove = function() {
        $scope.loved = false;
        socket.unlove();
    };

    $scope.isLoggedIn = function() {
        return $scope.config && $scope.config.loggedInAs !== null && $scope.config.allowed;
    };

    $scope.isPlaying = function() {
        return $scope.currentTrack.artists ? true : false;
    };

    $scope.isActive = function() {
        return $scope.config ? $scope.config.active : false;
    };

    $scope.isScrobbling = function() {
        return $scope.config ? $scope.config.scrobbling : false;
    };

    $scope.skip = function(message) {
        $(".btn-skip").tooltip("hide");
        socket.sendSkip(message);
    };

    $scope.setScrobbling = function(value) {
        $scope.config.scrobbling = value;
        socket.sendScrobbleStatus(value);
    };

    $scope.setActive = function(value) {
        $scope.config.active = value;
        socket.sendActiveStatus(value);
    };

    // Some helper functions
    $scope.skippersNeeded = function() {
        return Math.ceil($scope.getActiveUserCount() / 2);
    };

    $scope.getRadioName = function() {
        return $scope.config ? $scope.config.radioname : "Client Room Radio";
    };

    $scope.getSocketReadyState = function() {
        return socket.sockjs.readyState;
    };

    $scope.getActiveUserCount = function() {
        var count = 0;
        Object.keys($scope.users).forEach(function (username) {
            if ($scope.users[username].active && $scope.users[username].allowed) {
                count++;
            }
        });
        return count;
    };

    $scope.requestNotificationPermissions = function() {
        notificationManager.request();
    };

    $scope.NotificationPermissionNeeded = function() {
        return notificationManager.permissionNeeded();
    };

    $scope.endOfDayRequest = function() {
        socket.endOfDayRequest();
    };

    $(document).ready(function() {
        var volume = $.cookie("volume");
        if (volume === undefined) {
            volume = 1;
        }

        var state = "stopped";

        function restart(player) {
            state = "starting";

            player.jPlayer("setMedia", {
                mp3: "/stream.mp3"
            });
            player.jPlayer("play");
        }

        $("#audio-player").jPlayer({
            playing: function(event) {
                console.log("started", event);
                state = "playing";
            },
            ended: function(event) {
                console.log("ended", event);
                state = "stopped";
            },
            error: function(error) {
                console.log("there was an error", error);
                state = "stopped";
            },
            ready: function () {
                var player = $(this);
                restart(player);

                function updateMute() {
                    if ($scope.muted || !$scope.config || !$scope.config.active || !$scope.config.allowed) {
                        // muted
                        state = "muted";
                        player.jPlayer("clearMedia");
                    } else {
                        // restart playback
                        console.log("restarting audio");
                        restart(player);
                    }
                }

                function checkPlaying(time) {
                    if (time !== 0 && state === "stopped") {
                        restart(player);
                    }
                }

                $scope.$watch("muted", updateMute);
                $scope.$watch("config.active", updateMute);
                $scope.$watch("config.allowed", updateMute);
                $scope.$watch("currentPositionInTrack", checkPlaying);

                $(".volume-slider-init").on("slide", function(ev){
                    volume = 1 - ev.value;
                    console.log(volume);
                    $.cookie("volume", volume);
                    player.jPlayer("volume", volume);
                });

                player.jPlayer("volume", volume);
            },
            swfPath: "/js",
            supplied: "mp3"
        });

        $(".volume-slider-init").slider().slider("setValue", 1 - volume);
    });


    $(".btn-tooltip").tooltip({
        container: "body"
    });

    $scope.clickOnVolumeBar = function(e) {
        var event = e || window.event;
        console.log(event);
        event.stopPropagation();
        $scope.muted = false;
    };

    // Update progress bar
    $scope.progressBarStyle = function() {
        return {"width": ($scope.currentPositionInTrack / ($scope.currentTrack.duration * 10)) + "%"};
    };

    $scope.durationInText = function() {
        var totalSeconds = $scope.currentTrack.duration;
        var minutes = Math.floor(totalSeconds / 60);
        var remainder = "" + totalSeconds % 60;

        remainder = "00".substring(0, 2 - remainder.length) + remainder;
        return minutes + ":" + remainder;
    };

    socket.configCallback.add(function (data) {
        $scope.config = data;
        $scope.$apply();
    });

    socket.newTrackCallback.add(function (data) {
        if (Object.keys($scope.currentTrack) === 0) {
            // this is a new track so set the position to 0
            $scope.currentPositionInTrack = 0;
        }

        $scope.currentTrack = data;

        $scope.loved = false;
        if (data.context
            && typeof data.context[$scope.config.loggedInAs] !== "undefined"
            && data.context[$scope.config.loggedInAs].userloved === "1") {
            $scope.loved = true;
        }

        $scope.bingo = data.bingo;

        $scope.$apply();
    });

    socket.bingoCallback.add(function (bingo) {
        $scope.bingo = bingo;
        $scope.$apply();
    });

    socket.progressCallback.add(function (progress) {
        $scope.currentPositionInTrack = $scope.currentTrack.duration * progress;
        $scope.$apply();
    });

    socket.usersCallback.add(function (data) {
        $scope.users = data;
        $scope.$apply();
    });

    socket.skippersCallback.add(function (data) {
        $scope.skippers = data;
        $scope.skipped = false;

        $scope.skippers.forEach(function (skipper) {
            if (skipper === $scope.config.loggedInAs) {
                $scope.skipped = true;
            }
        });
        $scope.$apply();
    });

    socket.sysCallback.add(function (data) {
        if (data.type === "skip") {
            $scope.skipped = true;
            $scope.$apply();
        }
    });
}
