initClientRoomRadio('/sockjs'); // eslint-disable-line

describe("ChatController", function() {
  var $el;
  var $scope;
  var $window;
  var socket;
  var chatController; // eslint-disable-line

  beforeEach(module('crr')); // eslint-disable-line

  beforeEach(inject(function($rootScope, $controller) { // eslint-disable-line
    $scope = $rootScope.$new();

    $el = angular.element(
      "<div>" +
        "<div class=\"chat-content\"></div>" +
        "<input class=\"chat-input\"/>" +
      "</div>");

    $scope.config = {
      username: "test-user"
    };

    $window = {
      innerHeight: 20,
      resize: function() {}
    };

    socket = {
      chatCallback: {
        add: function(fn) {
          socket.callback = fn;
        }
      }
    };

    chatController = $controller('ChatController', {
      $scope: $scope,
      $element: $el,
      $window: $window,
      socket: socket
    });
  }));

  it("subscribes to chat messages", function() {
    expect(typeof socket.callback).to.equal("function");
  });

  describe("when a new message arrives", function() {
    it("appends a new chat message with the username and text", function() {
      socket.callback({system: null, user: "user", text: "text"});
      expect($el.find(".chat-content .chat-line").length).to.equal(1);
      expect($el.find(".chat-content .chat-line .chat-name").text()).to.equal("user");
      expect($el.find(".chat-content .chat-line .chat-inner-text").text()).to.equal("text");
    });
  });

  describe("when a new track arrives", function() {
    it("manipulates the track into a message from the client room", function() {
      socket.callback({
        system: "newTrack",
        data: {
          artists: [{
            name: "artist"
          }],
          name: "track",
          timestamp: "1000",
          extension: {
            requester: "test-requester"
          }
        }
      });
      expect($el.find(".chat-content .chat-line").length).to.equal(1);
      expect($el.find(".chat-content .chat-line .chat-extra-text").text()).to.contain("test-requester");
      expect($el.find(".chat-content .chat-line .chat-inner-text").text()).to.equal("artist – track");
    });
  });
});

