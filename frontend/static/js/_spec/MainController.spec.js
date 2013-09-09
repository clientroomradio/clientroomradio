describe('a MainController', function() {

    var controller,
        mockScope,
        mockSocket;

    // Intentional global, that's what MainController wants for now.
    config = {};
    loggedInAs = "";

    beforeEach(function() {
        loggedInAs = 'test-user';
        mockScope = {};

        mockSocket = {
            newTrackCallback: {
                add: function() {},
            },
            progressCallback: {
                add: function() {},
            },
            usersCallback: {
                add: function() {},
            },
            skipCallback: {
                add: function() {},
            },
            skippersCallback: {
                add: function() {},
            },
            sysCallback: {
                add: function() {},
            }
        };

        controller = new MainController(mockScope, mockSocket);
    });

    it('should set a duration in text function on the passed in scope', function() {
        expect(typeof mockScope.durationInText).toBe("function");
    });

    describe('when calling duration in text', function() {

        it('should return the currect duration', function() {
            mockScope.currentTrack = {};

            mockScope.currentTrack.duration = 1000;
            expect(mockScope.durationInText()).toBe("0:01");

            mockScope.currentTrack.duration = 10000;
            expect(mockScope.durationInText()).toBe("0:10");

            mockScope.currentTrack.duration = 59000;
            expect(mockScope.durationInText()).toBe("0:59");

            mockScope.currentTrack.duration = 60000;
            expect(mockScope.durationInText()).toBe("1:00");

            mockScope.currentTrack.duration = 61000;
            expect(mockScope.durationInText()).toBe("1:01");
        });

    });

});

