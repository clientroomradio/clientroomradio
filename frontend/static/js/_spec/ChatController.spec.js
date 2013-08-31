describe('a ChatController', function() {

    var controller,
        $el,
        mockScope,
        mockSocket;

    beforeEach(function() {

        $el = $('<div><div class="chat-content"></div><input class="chat-input" /></div>');

        mockScope = {};
        mockSocket = {
            chatCallback: {
                add: function(fn) {
                    mockSocket.callback = fn;
                },
            }
        };

        controller = new ChatController(mockScope, $el, mockSocket);
    });

    it('subscribes to chat messages', function() {
        expect(typeof mockSocket.callback).toBe("function");
    });

    describe('when a new message arrives', function() {

        it('appends a new chat message with the username and text', function() {
            mockSocket.callback({user: 'user', text: 'text'});
            expect($el.find('.chat-content .chat-line').length).toBe(1);
            expect($el.find('.chat-content .chat-line .chat-name').text()).toBe('user');
            expect($el.find('.chat-content .chat-line .chat-inner-text').text()).toBe('text');
        });

    });

    describe('when a new track arrives', function() {

        it('manipulates the track into a message from the client room', function() {
            mockSocket.callback({creator: 'artist', title: 'track'});
            expect($el.find('.chat-content .chat-line').length).toBe(1);
            expect($el.find('.chat-content .chat-line .chat-name').text()).toBe('Client Room Radio');
            expect($el.find('.chat-content .chat-line .chat-inner-text').text()).toBe('artist — track');
        });

    });

});

