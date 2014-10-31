function SpotifySearchController($scope, socket) {
	var that=this;

	$scope.choosenTrack = null;

	$scope.update = _.debounce(function() {
		$scope.choosenTrack = null;
		$.get(
			'https://ws.spotify.com/search/1/track.json',
			{"q": $scope.searchTerm},
			function(data) {
				$scope.tracks = [];
				for (track in data.tracks) {
					if (data.tracks[track].album.availability.territories.indexOf('GB') != -1) {
						$scope.tracks.push(data.tracks[track]);
					}
				}
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
