function NavController($scope, socket, notification) {
	var that=this;

	$scope.requestNotificationPermissions = function() {
		notification.request();
	}

	$scope.NotificationPermissionNeeded = function() {
		return notification.permissionNeeded();
	}

	$scope.endOfDayRequest = function() {
		socket.endOfDayRequest();
	}
}