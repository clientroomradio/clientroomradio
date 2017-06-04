"use strict";

var events = require("events");

module.exports = class Chat extends events.EventEmitter {

  constructor(socket, dataStore, userDao, config) {
    super();

    this.socket = socket;
    this.dataStore = dataStore;
    this.userDao = userDao;
    this.config = config;

    this.backlog = dataStore.read("chat") || [];

    dataStore.record(this, "change", "chat");

    socket.on("chatMessage", (user, data) => {
      if (data.text.trim().length > 0) {
        this.send({
          user: user ? user.username : null,
          text: data.text
        });
      }
    });
  }

  send(data) {
    data.timestamp = new Date().getTime();
    if (this.backlog.length > this.config.chatBacklogLength) {
      this.backlog.splice(0, this.backlog.length - this.config.chatBacklogLength);
    }
    this.userDao.broadcast("chat", data, true);
    data.backlog = true;
    this.backlog.push(data);

    this.emit("change", this.backlog);
  }

  static getSystemMessageData(type, username, text, data) {
    return {
      system: type,
      user: username,
      text: text,
      data: data
    };
  }

  sendSystemMessage(type, username, text, data) {
    this.send(Chat.getSystemMessageData(type, username, text, data));
  }

  getBacklog() {
    return this.backlog;
  }

  userLeft(user) {
    this.sendSystemMessage("left", user.username);
  }

  userTimedOut(user) {
    this.sendSystemMessage("timedOut", user.username);
  }

  newUser(user) {
    this.sendSystemMessage("newUser", user.username);
  }

  userJoined(user) {
    this.sendSystemMessage("join", user.username);
  }

  userSkipped(user, message) {
    this.sendSystemMessage("skip", user.username, message);
  }

  userHasAlreadySkipped(user, message) {
    this.sendSystemMessage("alreadySkipped", user.username, message);
  }

  inactiveUserWantsToSkip(user, message) {
    this.sendSystemMessage("inactiveUserWantsToSkip", user.username, message);
  }

  userLoved(user) {
    this.sendSystemMessage("love", user.username);
  }

  userUnloved(user) {
    this.sendSystemMessage("unlove", user.username);
  }

  newTrack(track) {
    this.sendSystemMessage("newTrack", null, "", track);
  }

  spotifyRequest(user, track) {
    this.sendSystemMessage("spotifyRequest", user.username, "", track);
  }

  skipSuccessful(skippers) {
    this.sendSystemMessage("skipSuccessful", null, "", skippers);
  }

  startVoting(user, type, data, id) {
    this.sendSystemMessage("startVoting", user ? user.username : null, "", {
      type: type,
      data: data,
      id: id
    });
  }

  userBecomesInactive(user, message) {
    this.sendSystemMessage("becomesInactive", user.username, message);
  }

  userBecomesActive(user, message) {
    this.sendSystemMessage("becomesActive", user.username, message);
  }

  clear(user) {
    this.userDao.sendToUsername(user.username, "chat", Chat.getSystemMessageData("clear", user.username));
  }
};

