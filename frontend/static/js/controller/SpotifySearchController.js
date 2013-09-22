function SpotifySearchController($scope, socket) {
	var that=this;

	$scope.choosenTrack = null;

	$scope.update = _.debounce(function() {
		$scope.choosenTrack = null;
		$.get(
			'http://ws.spotify.com/search/1/track.json',
			{"q": $scope.searchTerm},
			function(data) {
				$scope.tracks = data.tracks;
				$scope.$apply();
			}
		);
	}, 300);

	$scope.clickTrack = function(track) {
		$scope.choosenTrack = track;
		console.log(track);
	}
	
	$scope.request = function() {
		socket.sendRequest($scope.choosenTrack);
	}
}