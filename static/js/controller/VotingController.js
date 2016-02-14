function VotingController($scope, socket) {
    $scope.id = null;
    $scope.votes = null;
    $scope.remainingSeconds = "";
    $scope.decision = null;

    $scope.vote = function(vote) {
        socket.castVote($scope.id, vote);
    };

    $scope.init = function(id) {
        $scope.id = id;
        socket.requestVotingUpdate(id);
    };

    $scope.initWithSession = function() {
        socket.openCallback.add(function () {
            if (!$scope.id) {
                var session = $.cookie("session");
                if (typeof session !== "undefined") {
                    $scope.id = session;
                    socket.requestVotingUpdate($scope.id);
                }
                $scope.$apply();
            }
        });
    };

    $scope.userHasVoted = function() {
        for (var username in $scope.votes) {
            if (username === loggedInAs) {
                return $scope.votes[username];
            }
        }
    };

    $scope.hasBeenDecided = function() {
        return $scope.decision !== null;
    };

    socket.updateVotesCallback.add(function (voting) {
        if (voting.id === $scope.id) {
            $scope.votes = voting.votes;
            $scope.remainingSeconds = Math.round(voting.remainingTime / 1000);
            $scope.decision = voting.decision;
            $scope.$apply();
        }
    });
}
