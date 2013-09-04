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

	// There's also always one happening on pageload. Avoid that by not enabling this from start
	setTimeout(function() {
		// newTrack updates can happen more than once
		var lastIdentifier = null; 
		socket.newTrackCallback.add(function(track) {
			if (track.identifier && track.identifier != lastIdentifier) {
				notify('New track' , track.creator + ' - ' + track.title);
				lastIdentifier = track.identifier;
			}
		});

		socket.skippersCallback.add(function(skippers) {
			if (skippers.length > 0) {
				notify('Skipster!', skippers.join(', '));
			}
		});
	}, 3000);
	


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