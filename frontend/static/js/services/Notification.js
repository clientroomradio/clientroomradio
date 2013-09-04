var Notification = function(socket) {
	var that = this;

	socket.chatCallback.add(function(data) {
		var text = data.text;
		if (text && text.indexOf(loggedInAs) != -1) {
			if (data.user && !data.backlog && data.user != loggedInAs) {
				notify('Mentioned by ' + data.user , text);
			}
		}
		
	});

	function notify(title, text) {
		if (window.webkitNotifications.checkPermission() == 0) {
			var notification = window.webkitNotifications.createNotification(
				'/img/crr_128.png', title, text
			);

			notification.onclick = function () {
				notification.close();
				window.focus();
				clearTimeout(closeTimeout);
			}

			notification.show();
			closeTimeout = setTimeout(function() { notification.close(); }, 3000);
		} 
	}

	that.request = function() {
		window.webkitNotifications.requestPermission();
	}

	that.permissionNeeded = function() {
		return window.webkitNotifications.checkPermission() != 0;
	}


}