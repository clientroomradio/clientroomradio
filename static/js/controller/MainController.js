
function MainController($scope, socket) {
    $scope.username = loggedInAs;
    $scope.radioname = config.name;
    $scope.currentTrack = {};
    $scope.users = {};
    $scope.skippers = [];
    $scope.currentPositionInTrack = 0;
    $scope.loved = false;
    $scope.skipped = false;
    $scope.scrobbling = true;
    $scope.active = true;
    $scope.stream = config.stream;
    $scope.muted = false;
    $scope.discoveryHour = false;
    $scope.bingo = false;

    $scope.login = function() {
        location.href = "http://www.last.fm/api/auth/?api_key="+config.api_key+"&cb="+$(location).attr('href')+"login";
    }

    $scope.love = function() {
        $scope.loved = true;
        socket.love();
    }

    $scope.unlove = function() {
        $scope.loved = false;
        socket.unlove();
    }

    $scope.isPlaying = function() {
        return $scope.currentTrack.artists ? true : false;
    }

    $scope.skip = function(message) {
        $('.btn-skip').tooltip('hide');
        socket.sendSkip(message);
    }

    $scope.setScrobbling = function(value) {
        $scope.scrobbling = value;
        socket.sendScrobbleStatus(value);
    }

    $scope.setActive = function(value) {
        $scope.active = value;
        socket.sendActiveStatus(value);
    }

    $scope.getListeningHistoryLink = function() {
        return config.listeningHistory;
    }

    // Some helper functions
    $scope.skippersNeeded = function() {
        return Math.ceil($scope.getActiveUserCount() / 2);
    } 

    $scope.getActiveUserCount = function() {
        var count = 0;
        Object.keys($scope.users).forEach(function(username) {
            if ($scope.users[username].active) {
                count++;
            }
        });
        return count;
    }

    // Music
    if (loggedInAs) {
        $(document).ready(function() {
            var volume = $.cookie('volume');
            if (volume === undefined) {
                volume = 1;
            }

            var state = "stopped";

            function restart(player) {
                state = "starting";

                player.jPlayer("setMedia", {
                    mp3: config.stream
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
                        if ($scope.muted || (!$scope.active)) {
                            // muted
                            state = "muted";
                            player.jPlayer("clearMedia");
                        } else {
                            // restart playback
                            restart(player);
                        }
                    }

                    function checkPlaying(time) {
                        console.log("position update", time, state);
                        if (time !== 0 && state === "stopped") {
                            restart(player);
                        }
                    }

                    $scope.$watch('muted', updateMute);
                    $scope.$watch('active', updateMute);
                    $scope.$watch('currentPositionInTrack', checkPlaying);

                    $('.volume-slider-init').on('slide', function(ev){
                        volume = 1-ev.value;
                        console.log(volume);
                        $.cookie('volume', volume);
                        player.jPlayer("volume", volume);
                    });

                    player.jPlayer("volume", volume);
                },
                swfPath: "/js",
                supplied: "mp3"
            });

            $('.volume-slider-init').slider().slider('setValue', 1-volume);
        });
    }


    $('.btn-tooltip').tooltip({
        container: 'body'
    });

    $scope.clickOnVolumeBar = function(e) {
        var event = e || window.event;
        console.log(event);
        event.stopPropagation();
        $scope.muted = false;
    }

    // Update progress bar

    $scope.progressBarStyle = function() {
        return {'width':  ($scope.currentPositionInTrack / ($scope.currentTrack.duration * 10)) + '%'};
    };

    $scope.durationInText = function() {
        var totalSeconds   = $scope.currentTrack.duration,
            minutes        = Math.floor(totalSeconds / 60),
            remainder      = "" + totalSeconds % 60;

        remainder = "00".substring(0, 2 - remainder.length) + remainder;
        return minutes + ':' + remainder;
    }

    socket.newTrackCallback.add(function(data) {
        $scope.currentTrack = data;

        $scope.loved = false;
        if (data.context
            && typeof data.context[loggedInAs] != 'undefined'
            && data.context[loggedInAs].userloved == 1) {
            $scope.loved = true;
        }

        $scope.bingo = data.bingo;

        $scope.$apply();
    });

    socket.discoveryHourCallback.add(function(discoveryHour) {
        $scope.discoveryHour = discoveryHour;
        $scope.$apply();
    });

    socket.bingoCallback.add(function(bingo) {
        $scope.bingo = bingo;
        $scope.$apply();
    });
            
    socket.progressCallback.add(function(progress) {
        $scope.currentPositionInTrack = $scope.currentTrack.duration * progress;
        $scope.$apply();
    });

    socket.usersCallback.add(function(data) {
        Object.keys(data).forEach(function(username) {
            if (username == loggedInAs) {
                $scope.active = data[username].active;
                $scope.scrobbling = data[username].scrobbling;
            }
        });
        $scope.users = data;
        $scope.$apply();
    });

    socket.skippersCallback.add(function(data) {
        $scope.skippers = data;
        $scope.skipped = false;
        for(var i=0, len=data.length; i < len; i++){
            var user = data[i];
            if (user == loggedInAs) {
                $scope.skipped = true;
            }
        }
        $scope.$apply();
    });

    socket.sysCallback.add(function(data) {
        if (data.type == 'skip') {
            $scope.skipped = true;
            $scope.$apply();
        }
    });


}