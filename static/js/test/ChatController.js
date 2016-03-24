describe("a ChatController", function() {
  var $el;
  var mockScope;
  var mockCompile;
  var mockSocket;

  beforeEach(function() {
    $el = $("<div><div class=\"chat-content\"></div><input class=\"chat-input\" /></div>");

    mockScope = {
      config: {
        username: "test-user"
      }
    };
    mockCompile = {};
    mockSocket = {
      chatCallback: {
        add: function(fn) {
          mockSocket.callback = fn;
        }
      }
    };

    controller = new ChatController(mockScope, $el, mockCompile, mockSocket);
  });

  it("subscribes to chat messages", function() {
    expect(typeof mockSocket.callback).to.equal("function");
  });

  describe("when a new message arrives", function() {

    it("appends a new chat message with the username and text", function() {
      mockSocket.callback({system: null, user: "user", text: "text"});
      expect($el.find(".chat-content .chat-line").length).to.equal(1);
      expect($el.find(".chat-content .chat-line .chat-name").text()).to.equal("user");
      expect($el.find(".chat-content .chat-line .chat-inner-text").text()).to.equal("text");
    });
  });

  describe("when a new track arrives", function() {

    it("manipulates the track into a message from the client room", function() {
      mockSocket.callback({
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

