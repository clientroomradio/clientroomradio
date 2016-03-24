"use strict";

module.exports = class EndOfDayRequestManager {
  constructor(userDao, votingManager, socket) {
    this.userDao = userDao;
    this.votingManager = votingManager;
    this.socket = socket;

    this.socket.on("endOfDayRequest", requestUser => {
      this.votingManager.propose("endOfDay", requestUser, {}, successful => {
        if (successful) {
          this.userDao.setUsersInactive();
        }
      });
    });
  }
};
