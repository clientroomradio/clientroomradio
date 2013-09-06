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
	$scope.stream = config.stream;
	$scope.muted = false;

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
		return $scope.currentTrack.creator ? true : false; 
	}

	$scope.skip = function(message) {
		socket.sendSkip(message);
	}

	$scope.setScrobbling = function(value) {
		$scope.scrobbling = value;
		socket.sendScrobbleStatus(value);
	}

	// Some helper functions
	$scope.skippersNeeded = function() {
		return Math.ceil($scope.getUserCount() / 2);
	} 

	$scope.getUserCount = function() {
		// See: http://kangax.github.io/es5-compat-table/#Object.keys
		return Object.keys($scope.users).length;
	}

	$scope.askForSkipMessage = function() {
		$('#skipModal').modal({backdrop: false});
	}

	$scope.askForSkipMessageSend = function() {
		var reason = $('#skipReason').val();
		$scope.skip(reason);
		$('#skipModal').modal('hide')
	}

	// Music
	$(document).ready(function(){

		$("#audio-player").jPlayer({
	 		ready: function () {
	    		var $player = $(this).jPlayer("setMedia", {
	    			mp3: config.stream
	    		});

	    		$player.jPlayer("play");

	    		$scope.$watch('muted', function() {
					$player.jPlayer("mute", $scope.muted);
				});
	    	},
	    	swfPath: "/js",
	    	supplied: "mp3"
		});
	});
	  




	// Update progress bar

	$scope.progressBarStyle = function() {
		return {'width':  ($scope.currentPositionInTrack / $scope.currentTrack.duration * 100) + '%'};
	};

	$scope.durationInText = function() {
		var totalSeconds   = $scope.currentTrack.duration / 1000,
			minutes        = Math.floor(totalSeconds / 60),
			remainder      = "" + totalSeconds % 60;

		remainder = "00".substring(0, 2 - remainder.length) + remainder;
		return minutes + ':' + remainder;
	}

	socket.newTrackCallback.add(function(data) {
		$scope.currentTrack = data;

		$scope.loved = false;
		if (data.context) {
			for(var i=0, len=data.context.length; i < len; i++){
				if(data.context[i].userloved == 1 && loggedInAs == data.context[i].username) {
					$scope.loved = true;
				}
			}
		}

		$scope.$apply();
	});
			
	socket.progressCallback.add(function(progress) {
		$scope.currentPositionInTrack = $scope.currentTrack.duration * progress;
		$scope.$apply();
	});

	socket.usersCallback.add(function(data) {
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