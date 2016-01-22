function SpotifySearchController($scope, socket) {
	var that=this;

	$scope.choosenTrack = null;

	$scope.update = _.debounce(function() {
		$scope.choosenTrack = null;
		$.get(
			'https://api.spotify.com/v1/search/',
			{
				"q": $scope.searchTerm,
				"type": "track"
			},
			function(data) {
				$scope.tracks = [];
				for (track in data.tracks.items) {
					if (data.tracks.items[track].available_markets.indexOf('GB') != -1) {
						$scope.tracks.push(data.tracks.items[track]);
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
