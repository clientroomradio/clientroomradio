initClientRoomRadio('/sockjs'); // eslint-disable-line

describe("MainController", function() {
  var $scope;
  var socket;
  var notificationManager;
  var mainController; // eslint-disable-line

  beforeEach(module('crr')); // eslint-disable-line

  beforeEach(inject(function($rootScope, $controller) { // eslint-disable-line
    $scope = $rootScope.$new();
    socket = {};
    notificationManager = {};

    var callbacks = [
      "chatCallback",
      "newTrackCallback",
      "progressCallback",
      "usersCallback",
      "skipCallback",
      "skippersCallback",
      "sysCallback",
      "disconnectedCallback",
      "readyStateCallback",
      "configCallback",
      "bingoCallback"];

    callbacks.forEach(function(callback) {
      socket[callback] = {add: function() {}};
    });

    mainController = $controller('MainController', {
      $scope: $scope,
      socket: socket,
      notificationManager: notificationManager
    });
  }));

  it("should set a duration in text function on the passed in scope", function() {
    expect(typeof $scope.durationInText).to.equal("function");
  });

  describe("when calling duration in text", function() {
    it("should return the currect duration", function() {
      $scope.currentTrack = {};

      expect($scope.durationInText()).to.equal("0:00");

      $scope.currentTrack.duration = 1000;
      expect($scope.durationInText()).to.equal("0:01");

      $scope.currentTrack.duration = 10000;
      expect($scope.durationInText()).to.equal("0:10");

      $scope.currentTrack.duration = 59000;
      expect($scope.durationInText()).to.equal("0:59");

      $scope.currentTrack.duration = 60000;
      expect($scope.durationInText()).to.equal("1:00");

      $scope.currentTrack.duration = 61000;
      expect($scope.durationInText()).to.equal("1:01");
    });
  });
});

