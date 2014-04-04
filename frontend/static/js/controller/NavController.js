function NavController($scope, socket, notificationManager) {
	var that=this;

	$scope.requestNotificationPermissions = function() {
		notificationManager.request();
	}

	$scope.NotificationPermissionNeeded = function() {
		return notificationManager.permissionNeeded();
	}

	$scope.endOfDayRequest = function() {
		socket.endOfDayRequest();
	}

	$scope.discoveryHourRequest = function() {
		socket.discoveryHourRequest();
	}
}