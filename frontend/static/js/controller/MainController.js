function MainController($scope, socket) {
	$scope.username = loggedInAs;
	$scope.radioname = config.radioname;
	$scope.currentTrack = {};
	$scope.users = [];
	$scope.skippers = [];
	$scope.currentPositionInTrack = 0;
	$scope.loved = false;
	$scope.skipped = false;


	$scope.login = function() {
		location.href = "http://www.last.fm/api/auth/?api_key="+config.api_key+"&cb=http://"+config.host+":"+config.port+"/login";
	}

	$scope.love = function() {
		$scope.loved = true;
	}

	$scope.unlove = function() {
		$scope.loved = false;
	}

	$scope.skip = function() {
		$scope.skipped = true;
	}

	// Some helper functions
	$scope.skippersNeeded = function() {
		return Math.ceil($scope.getUserCount() / 2);
	} 

	$scope.getUserCount = function() {
		return _.keys($scope.users).length;
	}

	// Update progress bar
	var intervalProgressBar = null;
	var resetProgressBar = function() {
		if (intervalProgressBar != null) {
			clearInterval(intervalProgressBar);
		}
		$scope.currentPositionInTrack = 0;
		intervalProgressBar = setInterval(function() {
			$scope.currentPositionInTrack += 100;
			$scope.$apply();
		}, 100);
	};
	$scope.progressBarStyle = function() {
		return {'width':  ($scope.currentPositionInTrack / $scope.currentTrack.duration * 100) + '%'};
	};
	$scope.durationInText = function() {
		var inSec = $scope.currentTrack.duration / 1000;

		return Math.floor(inSec / 60) + ':' + (inSec % 60);
	}

	socket.newTrackCallback.add(function(data) {
		$scope.currentTrack = data;
		resetProgressBar();
		$scope.$apply();
	});
			
	socket.usersCallback.add(function(data) {
		$scope.users = data;
		$scope.$apply();
	});

	socket.skippersCallback.add(function(data) {
		$scope.skippers = data;
		$scope.$apply();
	});
}