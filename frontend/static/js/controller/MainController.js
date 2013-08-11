function MainController($scope) {
	$scope.username = loggedInAs;
	$scope.radioname = config.radioname;

	$scope.login = function() {
		location.href = "http://www.last.fm/api/auth/?api_key="+config.api_key+"&cb=http://"+config.host+":"+config.port+"/login";
	}
}