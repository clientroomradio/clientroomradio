function VotingController($scope, socket) {
    $scope.id = null;
    $scope.votes = null;
    $scope.remainingSeconds = "";
    $scope.decision = null;
    $scope.config = null;

    $scope.vote = function(vote) {
        socket.castVote($scope.id, vote);
    };

    $scope.init = function(id) {
        $scope.id = id;
        socket.requestVotingUpdate(id);
    };

    $scope.initWithSession = function() {
        socket.configCallback.add(function (data) {
            // the user is not allowed so there's probably a vote going on
            $scope.id = data.session;
            socket.requestVotingUpdate($scope.id);
            $scope.$apply();
        });
    };

    $scope.userHasVoted = function() {
        for (var username in $scope.votes) {
            if (username === $scope.config.username) {
                return $scope.votes[username];
            }
        }
    };

    $scope.hasBeenDecided = function() {
        return $scope.decision !== null;
    };

    $scope.isVoting = function() {
        // there are votes and it hasn't been decided
        return $scope.votes && !$scope.hasBeenDecided();
    }

    socket.configCallback.add(function (data) {
        $scope.config = data;
        $scope.$apply();
    });

    socket.updateVotesCallback.add(function (voting) {
        if (voting.id === $scope.id) {
            $scope.votes = voting.votes;
            $scope.remainingSeconds = Math.round(voting.remainingTime / 1000);
            $scope.decision = voting.decision;
            $scope.$apply();
        }
    });
}
