function initClientRoomRadio(socketUrl) {
	var blackjackAttackAngular = angular.module('crrAngular', [])
	.service('socket', Socket)

	.value('SOCKJS_URL', socketUrl);
}

