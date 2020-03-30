"use strict";

export function NotificationManager($window, $timeout, $log, socket) {
  var that = this;
  var config = null;

  function notify(title, text, image) {
    if (!that.permissionNeeded()) {
      image = image || "/img/crr_128.png";
      var notification = new $window.Notification(
        title,
        {
          icon: image,
          body: text
        }
        );

      notification.onclick = function() {
        notification.close();
        $window.focus();
      };

      $timeout(function() {
        notification.close();
      }, 3000);
    }
  }

  socket.newVoteCallback.add(function(data) {
    var text = "There's a new vote";

    $log.log(data);

    if (data.type === "newUser") {
      text = data.user + " wants to join. Let them?";
    } else if (data.type === "endOfDay") {
      text = data.user + " wants to call it a day";
    }

    notify("New Vote!", text);
  });

  socket.configCallback.add(function(data) {
    config = data;
  });

  socket.chatCallback.add(function(data) {
    var text = data.text;
    if (text && config && text.indexOf(config.username) !== -1) {
      if (data.user && !data.backlog && data.user !== config.username) {
        notify("Mentioned by " + data.user, text);
      }
    }
  });

  // There's also always one happening on pageload. Avoid that by not enabling this from start
  $timeout(function() {
    // newTrack updates can happen more than once
    var lastIdentifier = null;
    socket.newTrackCallback.add(function(track) {
      if (track.identifier && track.identifier !== lastIdentifier) {
        notify("New track", track.artists[0].name + " - " + track.name, track.image);
        lastIdentifier = track.identifier;
      }
    });

    socket.skipCallback.add(function(data) {
      notify(data.skipper.username + " skipped!", data.text, data.skipper.image);
    });
  }, 3000);

  that.request = function() {
    $window.Notification.requestPermission(function() {
      // alert("Permissions state: " + window.Notification.permission);
    });
  };

  that.permissionNeeded = function() {
    return $window.Notification && $window.Notification.permission !== "granted";
  };
}
