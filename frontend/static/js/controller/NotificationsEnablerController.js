var NotificationsEnablerController = function($scope, notification) {
	var that=this;

	$scope.request = function() {
		notification.request();
	}

	$scope.permissionNeeded = function() {
		return notification.permissionNeeded();
	}
}