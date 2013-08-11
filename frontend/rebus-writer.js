var rebus = require('rebus');

var bus = rebus('../rebus-storage', function(err) {
  var users = bus.value.users || {users: []};

  users.users.push('anotherUser')

  bus.publish(
    'users',
    users,
    function(err) {
     console.log(
       'published some other object and its value now:',
       bus.value.users);
  });

  // Cleanup
  bus.close();
});