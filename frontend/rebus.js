var rebus = require('rebus');

var bus = rebus('../rebus-storage', function(err) {

  console.log('the entire shared state is:', bus.value);
  
  var notification = bus.subscribe('users', function(obj) {
    console.log(obj);
  });
  
  //notification.close();
  //bus.close();
});