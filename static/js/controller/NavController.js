"use strict";

function NavController($scope, socket, notificationManager) {

    $scope.requestNotificationPermissions = function() {
        notificationManager.request();
    };

    $scope.NotificationPermissionNeeded = function() {
        return notificationManager.permissionNeeded();
    };

    $scope.endOfDayRequest = function() {
        socket.endOfDayRequest();
    };
}
