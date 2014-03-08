module.exports = function(userDao, permissionChecker, config) {
	var that = this;
	this.setMaxListeners(0);

	var sockjs = require('sockjs').createServer();

	// Used for faning out broadcasts
	var events = require("events");
	var broadcastEventHandler = new events.EventEmitter();
	broadcastEventHandler.setMaxListeners(0);

	sockjs.on('connection', function(conn) {
		var send = function(type, data) {
			conn.write(JSON.stringify({type: type, data: data}));
		};

		conn.once('data', function(session) {
			var user = null;

			if (session != '') {
				try {
					console.log('session: ', session);
					var sessionJSON = JSON.parse(session);
					console.log('session: ', sessionJSON);
					var username = sessionJSON.session.name;
					var key = sessionJSON.session.key;

					if (permissionChecker.isAllowedToJoin(username)) {
						user = userDao.addUser(username, key, key);
					}
					
				} catch (err) {
					user = userDao.getUserBySession(session);
				}

				if (user == null) {
					// This can happen when the user times out.
					send('disconnected', null);
				} else {
					broadcastEventHandler.on('loggedInBroadcast', send);

					console.log('connected to %s', user.username);

					that.emit('join', user, send);
					conn.on('data', function(dataAsString) {
						var payload = JSON.parse(dataAsString);
						var type = payload.type;
						var data = payload.data;
						if (!that.emit(type, user, data, send)) {
							console.log('No event handler found for type "%s"', type);
						}
					});
				}
			}
			broadcastEventHandler.on('broadcast', send);

			// Clean up when connection drops
			conn.on('close', function() {
		    	broadcastEventHandler.removeListener('loggedInBroadcast', send);
		    	broadcastEventHandler.removeListener('broadcast', send);
		    });

		});

	});

	that.getSockJs = function() {
		return sockjs;
	}

	that.broadcast = function(type, data, loggedInOnly) {
		var broadcastType = loggedInOnly ? 'loggedInBroadcast': 'broadcast';
		broadcastEventHandler.emit(broadcastType, type, data);
	}
}

require('util').inherits(module.exports, require("events").EventEmitter);