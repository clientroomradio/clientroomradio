function MainController($scope) {
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
		return Math.ceil(_.keys($scope.users).length / 2);
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

	// Sockjs
	var sock = new SockJS('http://localhost:3000/sockjs');
	sock.onopen = function() {
		console.log('open');
	};
	sock.onmessage = function(e) {

		var payload = JSON.parse(e.data);
		var type = payload.type;
		var data = payload.data;

		if (type == 'newTrack') {
			$scope.currentTrack = data;
			resetProgressBar();
		}

		if (type == 'users') {
			$scope.users = data;
			console.log('users', data);
		}

		if (type == 'skippers') {
			$scope.skippers = data;
			console.log('skippers', data);
		}

		$scope.$apply();
	};
	sock.onclose = function() {
		console.log('close');
	};
}