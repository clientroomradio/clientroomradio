"use strict";

export function ChatController($scope, $element, $compile, $log, $window, socket) {
  var $chatContent = angular.element(".chat-content", $element);
  var $input = angular.element(".chat-input", $element);

  var $newTrackChatLineTemplate = angular.element("<div class=\"chat-line chat-line--new-track clearfix\"><span class=\"chat-time pull-left\"></span><span class=\"chat-text\"><span class=\"chat-img pull-left\"></span><span><div class=\"chat-inner-text\"></div><div class=\"chat-extra-text\"></div></span></span></div>");
  var $simpleChatLineTemplate = angular.element("<div class=\"chat-line chat-line--text\"><span class=\"chat-time\"></span><span class=\"chat-text\"><span class=\"chat-name\"></span> <span class=\"chat-inner-text\"></span></span></div>");
  var $voteChatLineTemplate =
  angular.element("<div class=\"chat-line chat-line--sys chat-line--vote clearfix\" ng-controller=\"VotingController\">" +
      "<div class=\"pull-left\">" +
        "<span class=\"chat-time\"></span>" +
        "<span class=\"chat-text\">" +
          "<span class=\"chat-name\"></span> <span class=\"chat-inner-text\"></span> " +
          "<span ng-show=\"votes\" class=\"votes-cast\">" +
            "<span ng-repeat=\"(username, vote) in votes track by $index\"><span class=\"badge {{vote==='yes'?'vote-for':'vote-against'}}\">{{username}}</span><span ng-hide=\"$last\"> </span></span>" +
          "</span>" +
        "</span>" +
        "</div>" +
        "<div ng-show=\"votes\" class=\"pull-right\">" +
          "<span class=\"badge vote-decision vote-decision--{{decision}}\" ng-show=\"hasBeenDecided()\">{{decision === 'yes' ? 'accepted' : 'crushed'}}</span>" +
          "<div class=\"vote-action-area\" ng-hide=\"hasBeenDecided()\">" +
            "<div class=\"vote-remaining-time\">{{remainingSeconds}} Sec</div> " +
          "<div class=\"btn-group\">" +
            "<button type=\"button\" class=\"btn {{userHasVoted()==='yes'?'btn-success':'btn-default'}} btn-xs\" ng-click=\"vote('yes')\">Yes</button> " +
            "<button type=\"button\" class=\"btn {{userHasVoted()==='no'?'btn-danger':'btn-default'}} btn-xs\" ng-click=\"vote('no')\">No</button>" +
          "</div>" +
        "</div>" +
      "</div>" +
    "</div>");

  var getTimeString = function(timestamp) {
    var currentTime = new Date(timestamp);
    var hours = currentTime.getHours();
    var minutes = currentTime.getMinutes();

    if (minutes < 10) {
      minutes = "0" + minutes;
    }
    var suffix = "AM";
    if (hours >= 12) {
      suffix = "PM";
      hours -= 12;
    }
    if (hours === 0) {
      hours = 12;
    }

    return hours + ":" + minutes + " " + suffix;
  };

  socket.chatCallback.add(function(data) {
    var isScrolledDown = ($chatContent.scrollTop() + $chatContent.innerHeight() === $chatContent[0].scrollHeight);
    var $el = $simpleChatLineTemplate.clone();

    if (data.text && data.text.indexOf("/me ") === 0) {
      data.text = data.text.substring(4);
      $el.addClass("chat-line--me");
    }

    if (data.system) {
      $el.addClass("chat-line--sys").addClass("chat-line--" + data.type);
    }

    if (data.system === "clear") {
      angular.element(".chat-content").empty();
    } else {
      if (data.system === "skip") {
        if (data.text) {
          angular.element(".chat-inner-text", $el).text("skipped: \"" + data.text + "\"");
        } else {
          angular.element(".chat-inner-text", $el).text("skipped");
        }
      } else if (data.system === "spotifyRequest") {
        if (data.data.href && data.data.artists && data.data.name) {
          angular.element(".chat-inner-text", $el).html("requested <a href=\"" + data.data.href + "\">" + data.data.artists[0].name + " — " + data.data.name + "</a>");
        } else if (data.data.uri) {
          angular.element(".chat-inner-text", $el).html("requested " + data.data.uri);
        }
      } else if (data.system === "alreadySkipped") {
        angular.element(".chat-inner-text", $el).text("has already skipped, but tried anyway.");
      } else if (data.system === "inactiveUserWantsToSkip") {
        angular.element(".chat-inner-text", $el).text("tried to skip whilst sitting out. Not in here you don't!");
      } else if (data.system === "love") {
        angular.element(".chat-inner-text", $el).text("just loved this track");
      } else if (data.system === "unlove") {
        angular.element(".chat-inner-text", $el).text("just un-loved this track");
      } else if (data.system === "scrobbleOff") {
        angular.element(".chat-inner-text", $el).text("turned scrobbling off");
      } else if (data.system === "scrobbleOn") {
        angular.element(".chat-inner-text", $el).text("turned scrobbling on");
      } else if (data.system === "timedOut") {
        angular.element(".chat-inner-text", $el).text("has lost their connection and has been removed from the radio");
      } else if (data.system === "left") {
        angular.element(".chat-inner-text", $el).text("left");
      } else if (data.system === "join") {
        angular.element(".chat-inner-text", $el).text("joined");
      } else if (data.system === "newUser") {
        angular.element(".chat-inner-text", $el).text("has been voted in! Client Room Radio welcomes you!");
      } else if (data.system === "skipSuccessful") {
        angular.element(".chat-inner-text", $el).text("SKIP SUCCESSFUL! " + data.data.join(", ") + " voted to skip");
      } else if (data.system === "spotifyRequestComplete") {
        angular.element(".chat-inner-text", $el).html("request ready <a href=\"" + data.data.identifier + "\">" + data.data.artists[0].name + " — " + data.data.name + "</a>");
      } else if (data.system === "startVoting") {
        var vote = data.data;
        $el = $voteChatLineTemplate.clone();
        if (vote.type === "endOfDay") {
          angular.element(".chat-inner-text", $el).text("wants to call it a day.");
        } else if (vote.type === "newUser") {
          angular.element(".chat-inner-text", $el).text("wants to join.");
        }
        $el.attr("ng-init", "init(\"" + vote.id + "\")");
      } else if (data.system === "becomesInactive") {
        if (data.text) {
          angular.element(".chat-inner-text", $el).text("sat out: \"" + data.text + "\"");
        } else {
          angular.element(".chat-inner-text", $el).text("sat out");
        }
      } else if (data.system === "becomesActive") {
        if (data.text) {
          angular.element(".chat-inner-text", $el).text("rejoined: \"" + data.text + "\"");
        } else {
          angular.element(".chat-inner-text", $el).text("rejoined");
        }
      } else if (data.system === "newTrack") {
        $el = $newTrackChatLineTemplate.clone();
        $el.id = data.data.timestamp;

        if (data.data.extension.requester) {
          $el.addClass("chat-line--request-track");
          angular.element(".chat-extra-text", $el).text("requested by " + data.data.extension.requester);
        }

        angular.element(".chat-img", $el).html("<a target=\"_blank\" href=\"" + data.data.extension.trackpage + "\"><img class=\"album-art media-object img-thumbnail\" src=\"" + (data.data.image ? encodeURI(data.data.image.replace("http://img2-ak.lst.fm/", "https://secure-img2.last.fm/")) : "/img/crr_128.png") + "\"/></a>");
        angular.element(".chat-inner-text", $el).html("<h4><a target=\"_blank\" href=\"" + data.data.extension.artistpage + "\">" + data.data.artists[0].name + "</a> – <a target=\"_blank\" href=\"" + data.data.extension.trackpage + "\">" + data.data.name + "</a></h4>");
      } else {
        angular.element(".chat-inner-text", $el).html(linkify(data.text));
      }

      if (data.user) {
        angular.element(".chat-name", $el).text(data.user);
      } else if (Object.prototype.hasOwnProperty.call(data, "data") && Object.prototype.hasOwnProperty.call(data.data, "data")) {
        angular.element(".chat-name", $el).text(data.data.data.username);
      } else {
        angular.element(".chat-name", $el).text($scope.config.radioname);
      }

      angular.element(".chat-time", $el).text(getTimeString(data.timestamp));

      if (data.system === "startVoting") {
        $chatContent.append($compile($el)($scope));
      } else {
        $chatContent.append($el);
      }

      if (isScrolledDown) {
        scrollDown();
      }
    }
  });

  $element.bind("resize", function() {
    $log.log("resized");
  });

  $input.keyup(function(e) {
    var ENTER = 13;

    if (e.keyCode === ENTER) {
      var inputText = $input.val();
      if (inputText.indexOf("?skip") === 0) {
        inputText = inputText.substring(6);
        socket.sendSkip(inputText);
      } else if (inputText.indexOf("?request") === 0) {
        inputText = inputText.substring(9);
        socket.sendRequest({uri: inputText});
      } else if (inputText.indexOf("?away") === 0) {
        inputText = inputText.substring(6);
        socket.sendActiveStatus(false, inputText);
      } else if (inputText.indexOf("?leave") === 0) {
        inputText = inputText.substring(7);
        socket.sendActiveStatus(false, inputText);
      } else if (inputText.indexOf("?back") === 0) {
        inputText = inputText.substring(6);
        socket.sendActiveStatus(true, inputText);
      } else if (inputText.indexOf("?rejoin") === 0) {
        inputText = inputText.substring(8);
        socket.sendActiveStatus(true, inputText);
      } else {
        socket.sendChatMessage({
          user: $scope.config.username,
          text: inputText
        });
      }
      $input.val("");
    }
  });

  var scrollDown = function() {
    $chatContent.scrollTop($chatContent[0].scrollHeight);
  };

  var updateContainer = function() {
    var containerHeight = $window.innerHeight;
    $chatContent.css("height", Math.max(200, containerHeight - 355));
    scrollDown();
  };

  // Resize chat area
  angular.element(document).ready(function() {
    updateContainer();
    angular.element($window).resize(function() {
      updateContainer();
    });
  });

  // Taken from http://stackoverflow.com/questions/37684/how-to-replace-plain-urls-with-links
  var linkify = function(inputText) {
    // Escape first
    inputText = angular.element("<div/>").text(inputText).html();

    var replacedText;
    var replacePattern1;
    var replacePattern2;

    // URLs starting with http://, https://, or ftp://
    replacePattern1 = /(\b(https?|ftp):\/\/[-A-Z0-9+&@#/%?=~_|!:,.;]*[-A-Z0-9+&@#/%=~_|])/gim;
    replacedText = inputText.replace(replacePattern1, "<a target=\"_blank\" href=\"$1\" target=\"_blank\">$1</a>");

    // URLs starting with "www." (without // before it, or it"d re-link the ones done above).
    replacePattern2 = /(^|[^/])(www\.[\S]+(\b|$))/gim;
    replacedText = replacedText.replace(replacePattern2, "$1<a target=\"_blank\" href=\"http://$2\" target=\"_blank\">$2</a>");

    return replacedText;
  };
}
