function VotingController($scope, socket) {
    var id = null;
    var useSessionId = false;
    
    $scope.votes = null;
    $scope.remainingSeconds = "";
    $scope.decision = null;

    $scope.vote = function(vote) {
        socket.castVote($scope.getId(), vote);
    };

    $scope.init = function(initId) {
        id = initId;
        socket.requestVotingUpdate(id);
    };

    $scope.initWithSession = function() {
        useSessionId = true;
        socket.configCallback.add(function (data) {
            if (!$scope.votes) {
                socket.requestVotingUpdate($scope.getId());
            }
        });
    };

    $scope.getId = function() {
        return useSessionId ? $scope.config.session : id;
    } 

    $scope.userHasVoted = function() {
        if ($scope.votes && $scope.votes.hasOwnProperty($scope.config.username)) {
            return $scope.votes[$scope.config.username];
        }
    }

    $scope.hasBeenDecided = function() {
        return $scope.decision !== null;
    };

    $scope.isVoting = function() {
        // there are votes and it hasn't been decided
        return $scope.votes && !$scope.hasBeenDecided();
    }

    socket.updateVotesCallback.add(function (voting) {
        if (voting.id === $scope.getId()) {
            $scope.votes = voting.votes;
            $scope.remainingSeconds = Math.ceil(voting.remainingTime / 1000);
            $scope.decision = voting.decision;
            $scope.$apply();
        }
    });
}
