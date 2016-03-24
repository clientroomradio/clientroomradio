function SpotifySearchController($scope, socket) {
  $scope.choosenTrack = null;

  $scope.update = _.debounce(function() {
    $scope.choosenTrack = null;
    $.get(
      "https://api.spotify.com/v1/search/",
      {
        q: $scope.searchTerm,
        type: "track",
        market: "GB"
      },
      function(data) {
        // filter the search reults for ones we can play
        $scope.tracks = [];
        data.tracks.items.forEach(function(trackItem) {
          $scope.tracks.push(trackItem);
        });
        $scope.$apply();
      }
      );
  }, 300);

  $scope.clickTrack = function(track) {
    $scope.choosenTrack = track;
    console.log(track);
  };

  $scope.request = function() {
    socket.sendRequest($scope.choosenTrack);
  };
}
