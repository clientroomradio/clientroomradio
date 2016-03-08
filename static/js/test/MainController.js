describe("a MainController", function() {
    var mockScope,
        mockSocket,
        callbacks,
        controller;

    beforeEach(function(done) {
        mockScope = {};
        mockSocket = {};

        var callbacks =[
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
            mockSocket[callback] = {add: function() {}};
        });

        controller = new MainController(mockScope, mockSocket);

        done();
    });

    it("should set a duration in text function on the passed in scope", function() {
        expect(typeof mockScope.durationInText).to.equal("function");
    });

    describe("when calling duration in text", function() {

        it("should return the currect duration", function() {
            mockScope.currentTrack = {};

            mockScope.currentTrack.duration = 1000;
            expect(mockScope.durationInText()).to.equal("0:01");

            mockScope.currentTrack.duration = 10000;
            expect(mockScope.durationInText()).to.equal("0:10");

            mockScope.currentTrack.duration = 59000;
            expect(mockScope.durationInText()).to.equal("0:59");

            mockScope.currentTrack.duration = 60000;
            expect(mockScope.durationInText()).to.equal("1:00");

            mockScope.currentTrack.duration = 61000;
            expect(mockScope.durationInText()).to.equal("1:01");
        });

    });

});

