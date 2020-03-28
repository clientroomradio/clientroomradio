"use strict";

/* globals Util */

this.YouTubeSearchController = function($scope, $log, $timeout, socket) {
  $scope.choosenTrack = null;

  $scope.update = _.debounce(function() {
    $scope.choosenTrack = null;
    $.get(
      "https://www.googleapis.com/youtube/v3/search",
      {
        q: $scope.searchTerm,
        part: "snippet",
        maxResults: 10,
        type: "video",
        videoCategoryId: "10", // Music
        key: "AIzaSyAIIwR4EXwcKuH9WZ3EJWJWhg8SCI-te4s"
      },
      function(data) {
        $scope.tracks = data.items.map(function(item) {
          return {
            item: item,
            artistTrack: Util.processYoutubeVideoTitle(Util.decodeHtml(item.snippet.title))
          };
        }).filter(function(thing) {
          return !Util.isArtistTrackEmpty(thing.artistTrack);
        }).map(function(thing) {
          return {
            artists: [{name: thing.artistTrack.artist}],
            name: thing.artistTrack.track,
            href: "https://www.youtube.com/watch?v=" + thing.item.id.videoId,
            uri: "https://www.youtube.com/watch?v=" + thing.item.id.videoId
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
