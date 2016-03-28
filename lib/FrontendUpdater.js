"use strict";

module.exports = class FrontendUpdater {
  constructor(socket, userDao, currentTrackManager, skipManager, chat) {
    this.userDao = userDao;
    this.currentTrackManager = currentTrackManager;
    this.skipManager = skipManager;
    this.chat = chat;

    userDao.on("change", () => {
      userDao.broadcast("users", userDao.getAllowedUsers());
    });

    skipManager.on("change", data => {
      userDao.broadcast("skippers", data);
    });

    skipManager.on("userSkip", (skipper, text) => {
      userDao.broadcast("skip", {skipper: skipper, text: text});
    });

    currentTrackManager.on("change", currentTrack => {
      userDao.broadcast("newTrack", currentTrack);
    });

    socket.on("join", user => {
      this.updateUser(user);
    });

    socket.on("eavesdrop", user => {
      this.updateUser(user);
    });
  }

  updateUser(user) {
    this.userDao.sendToUsername(user.username, "config", this.userDao.getUserConfig(user));
    this.userDao.sendToUsername(user.username, "users", this.userDao.getUsers());
    this.userDao.sendToUsername(user.username, "skippers", this.skipManager.getData());
    this.userDao.sendToUsername(user.username, "newTrack", this.currentTrackManager.getCurrentTrack());

    var bingo = this.currentTrackManager.getCurrentTrack().bingo;
    this.userDao.sendToUsername(user.username, "bingo", typeof bingo !== "undefined" && bingo);

    // send the chat messages
    if (user && user.allowed) {
      this.chat.clear(user);
      this.chat.getBacklog().forEach(message => {
        this.userDao.sendToUsername(user.username, "chat", message);
      });
    }
  }
};
