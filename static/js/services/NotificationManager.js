"use strict";

var NotificationManager = function(socket) {
    var that = this;

    socket.chatCallback.add(function(data) {
        var text = data.text;
        if (text && text.indexOf(loggedInAs) !== -1) {
            if (data.user && !data.backlog && data.user !== loggedInAs) {
                notify("Mentioned by " + data.user, text);
            }
        }
    });

    // There"s also always one happening on pageload. Avoid that by not enabling this from start
    setTimeout(function() {
        // newTrack updates can happen more than once
        var lastIdentifier = null;
        socket.newTrackCallback.add(function(track) {
            if (track.identifier && track.identifier != lastIdentifier) {
                notify("New track" , track.artists[0].name + " - " + track.name, track.image);
                lastIdentifier = track.identifier;
            }
        });

        socket.skipCallback.add(function(skip) {
            notify(skip.skipper.username + " skipped!", skip.skippers.join(", "), skip.skipper.image);
        });
    }, 3000);

    function notify(title, text, image) {
        if (!that.permissionNeeded()) {
            image = image || "/img/crr_128.png";
            var notification = window.Notification(title,
                {
                    icon: image,
                    body: text
                }
            );

            notification.onclick = function () {
                notification.close();
                window.focus();
                clearTimeout(closeTimeout);
            };

            setTimeout(function () {
                notification.close();
            }, 3000);
        }
    }

    that.request = function() {
        window.Notification.requestPermission(function() {
            //alert("Permissions state: " + window.Notification.permission);
        });
    };

    that.permissionNeeded = function() {
        return window.Notification && window.Notification.permission !== "granted";
    };

    function getNotification() {
        if (window.Notification) {
            return true;
        }

        return false;
    }
};
