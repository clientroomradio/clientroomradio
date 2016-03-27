"use strict";

this.Socket = function($log, $timeout, $interval, SOCKJS_URL) {
  var that = this;
  this.closeCallback = new $.Callbacks();
  this.chatCallback = new $.Callbacks();
  this.sysCallback = new $.Callbacks();
  this.newTrackCallback = new $.Callbacks();
  this.usersCallback = new $.Callbacks();
  this.progressCallback = new $.Callbacks();
  this.skipCallback = new $.Callbacks();
  this.skippersCallback = new $.Callbacks();
  this.updateVotesCallback = new $.Callbacks();
  this.newVoteCallback = new $.Callbacks();
  this.bingoCallback = new $.Callbacks();
  this.configCallback = new $.Callbacks();
  this.disconnectedCallback = new $.Callbacks();
  this.readyStateCallback = new $.Callbacks();

  that.sockjs = null;
  var reconnectTimeout = null;

  function send(type, data) {
    var payload = {
      type: type,
      data: data
    };
    that.sockjs.send(angular.toJson(payload));
  }

  that.sendChatMessage = function(message) {
    send("chatMessage", message);
  };

  that.sendSkip = function(message) {
    send("skip", {text: message});
  };

  that.sendRequest = function(request) {
    send("request", request);
  };

  that.sendScrobbleStatus = function(status) {
    send("scrobbleStatus", status);
  };

  that.sendActiveStatus = function(status, message) {
    send("activeStatus", {
      status: status,
      message: message
    });
  };

  that.logout = function() {
    send("logout", {});
  };

  that.sendMutedStatus = function(status) {
    send("mutedStatus", {
      status: status
    });
  };

  that.love = function() {
    send("love", {});
  };

  that.unlove = function() {
    send("unlove", {});
  };

  that.endOfDayRequest = function() {
    send("endOfDayRequest", {});
  };

  that.requestVotingUpdate = function(id) {
    send("requestVotes", {id: id});
  };

  that.castVote = function(id, vote) {
    send("castVote", {id: id, vote: vote});
  };

  function connect() {
    that.sockjs = new SockJS(SOCKJS_URL);

    that.readyStateCallback.fire(that.sockjs.readyState);

    that.sockjs.onmessage = function(payload) {
      payload = $.parseJSON(payload.data);
      var type = payload.type;
      var data = payload.data;

      if (type === "disconnected") {
        that.disconnectedCallback.fire(data);
        return;
      }

      if (type === "config") {
        that.configCallback.fire(data);
        return;
      }

      if (type === "newTrack") {
        that.newTrackCallback.fire(data);
        return;
      }

      if (type === "users") {
        that.usersCallback.fire(data);
        return;
      }

      if (type === "skip") {
        that.skipCallback.fire(data);
        return;
      }

      if (type === "skippers") {
        that.skippersCallback.fire(data);
        return;
      }

      if (type === "progress") {
        that.progressCallback.fire(data);
        return;
      }

      if (type === "chat") {
        that.chatCallback.fire(data);
        return;
      }

      if (type === "sys") {
        that.sysCallback.fire(data);
        return;
      }

      if (type === "updateVotes") {
        that.updateVotesCallback.fire(data);
        return;
      }

      if (type === "newVote") {
        that.newVoteCallback.fire(data);
        return;
      }

      if (type === "bingo") {
        that.bingoCallback.fire(data);
        return;
      }

      $log("Unhandled Message: ", type, data);
    };

    var heartbeat = null;

    that.sockjs.onopen = function() {
      var session = $.cookie("session");
      if (angular.isUndefined(session)) {
        session = "";
      }
      send("login", {
        session: session
      });

      if (reconnectTimeout !== null) {
        reconnectTimeout = null;
        clearTimeout(reconnectTimeout);
      }

      heartbeat = $interval(function() {
        send("heartbeat", null);
      }, 2000);

      that.readyStateCallback.fire(that.sockjs.readyState);
    };
    that.sockjs.onclose = function() {
      that.closeCallback.fire();
      reconnectTimeout = $timeout(connect, 1000);
      clearInterval(heartbeat);

      that.readyStateCallback.fire(that.sockjs.readyState);
    };
  }

  connect();
};
