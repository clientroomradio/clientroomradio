var Socket = function(SOCKJS_URL) {
	var that = this;
	this.openCallback = $.Callbacks();
	this.closeCallback = $.Callbacks();
	this.chatCallback = $.Callbacks();
	this.newTrackCallback = $.Callbacks();
	this.usersCallback = $.Callbacks();
	this.skippersCallback = $.Callbacks();

	var sockjs;
	var reconnectTimeout = null;

	function send(type, data) {
		var payload = {
			'type': type,
			'data': data
		};
		sockjs.send(JSON.stringify(payload));
	}
	that.sendChatMessage = function(message) {
		send('chatMessage', message);
		console.log(message);
	}

	function connect () {
		sockjs = new SockJS(SOCKJS_URL);

		sockjs.onmessage = function(payload) {
			payload = $.parseJSON(payload.data);
			console.log(payload);
			//ar payload = jQuery.parseJSON(payloadAsString);
			var type = payload.type;
			var data = payload.data;

			if (type == 'newTrack') {
				that.newTrackCallback.fire(data);
				return;
			}

			if (type == 'users') {
				that.usersCallback.fire(data);
				return;
			}

			if (type == 'skippers') {
				that.skippersCallback.fire(data);
				return;
			}

			if (type == 'chat') {
				that.chatCallback.fire(data);
				return;
			}

			console.log('Unhandled Message: ', type, data);
		};


		sockjs.onopen = function() {
			if (reconnectTimeout != null) {
				reconnectTimeout = null;
				clearTimeout(reconnectTimeout);
			}
			that.openCallback.fire();
		};
		sockjs.onclose = function() {
			that.closeCallback.fire();
			reconnectTimeout = setTimeout(connect, 1000);
		};
	};

	connect();
	
	
	
}