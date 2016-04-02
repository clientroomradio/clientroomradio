"use strict";

/* globals Socket, NotificationManager, ChatController, MainController, SpotifySearchController, VotingController */

this.initClientRoomRadio = function(socketUrl) {
  angular.module('crr', [])
    .controller("ChatController", ChatController)
    .controller("MainController", MainController)
    .controller("SpotifySearchController", SpotifySearchController)
    .controller("VotingController", VotingController)
    .factory("socket", socket)
    .factory("notificationManager", notificationManager)
    .value("SOCKJS_URL", socketUrl)
    .directive("tooltip", function() {
      return {
        restrict: "A",
        link: function() {
          angular.element("body").tooltip({
            selector: '[data-toggle="tooltip"]',
            container: 'body'
          });
        }
      };
    });

  socket.$inject = ['$log', '$timeout', '$interval', 'SOCKJS_URL'];
  function socket($log, $timeout, $interval, SOCKJS_URL) {
    return new Socket($log, $timeout, $interval, SOCKJS_URL);
  }

  notificationManager.$inject = ['$window', '$timeout', '$log', 'socket'];
  function notificationManager($window, $timeout, $log, socket) {
    return new NotificationManager($window, $timeout, $log, socket);
  }
};
