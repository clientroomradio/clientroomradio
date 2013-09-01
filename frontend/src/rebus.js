var rebus = require('rebus');

module.exports = rebus('../rebus-storage', function() {
	console.log('Connected to Rebus');
	module.exports.onReady();
});
