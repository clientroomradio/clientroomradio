"use strict";

this.YouTubeSearchController = function($scope, $log, $timeout, socket) {
  $scope.choosenTrack = null;

  $scope.update = _.debounce(function() {
    $scope.choosenTrack = null;
    $.get(
      "https://www.googleapis.com/youtube/v3/search",
      {
        q: $scope.searchTerm,
        part: "snippet",
        maxResults: 25,
        type: "video",
        videoCategoryId: "10", // Music
        key: "AIzaSyCT2bCuVsNzFI6XmHIiwPHRt4V_wg5qv7w"
      },
      function(data) {
        $scope.tracks = data.items.map(function(item) {
          return {
            // don't set artists property as we can't split artist and title at this point
            // just show the title as the name of the track
            name: item.snippet.title,
            href: "https://www.youtube.com/watch?v=" + item.id.videoId,
            uri: "https://www.youtube.com/watch?v=" + item.id.videoId
          };
        });
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
};
