"use strict";

export function SpotifySearchController($scope, $log, $timeout, socket) {
  $scope.choosenTrack = null;

  $scope.update = _.debounce(function() {
    $scope.choosenTrack = null;
    $.get(
      "https://api.spotify.com/v1/search/",
      {
        q: $scope.searchTerm,
        type: "track",
        market: "GB" // only tracks available in GB
      },
      function(data) {
        $scope.tracks = data.tracks.items;
        $scope.$apply();
      }
      );
  }, 300);

  $scope.clickTrack = function(track) {
    $scope.choosenTrack = track;
    $log.log(track);
  };

  $scope.request = function() {
    socket.sendRequest($scope.choosenTrack);
  };
}
