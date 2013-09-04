function initClientRoomRadio(socketUrl) {
	blackjackAttackAngular = angular.module('crrAngular', [])
	.service('socket', Socket)
	.service('notification', Notification)

	.value('SOCKJS_URL', socketUrl)

	// This is terrible, but it's needed to load the notifications module
	.run(["notification", function (notification) {}] );

}

