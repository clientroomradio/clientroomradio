"use strict";

var events = require("events");

module.exports = class SkipManager extends events.EventEmitter {
  constructor(userDao, currentTrackManager, socket, chat, logger) {
    super();

    // don't restrict how many listeners there can be
    this.setMaxListeners(0);

    // remember the objects passed in
    this.userDao = userDao;
    this.currentTrackManager = currentTrackManager;
    this.chat = chat;
    this.logger = logger;

    // the skip manager state
    this.skippers = [];
    this.skipProcessed = false;

    // listen for things
    userDao.on("change", () => {
      this.change();
    });

    currentTrackManager.on("change", currentTrack => {
      this.skippers.length = 0;
      // blank tracks are treated as if we've skipped already this means we
      // won't try to skip when the current track is blank between tracks
      this.skipProcessed = Object.keys(currentTrack).length === 0;
      this.change();
    });

    socket.on("skip", (user, data) => {
      var text = data.text;
      if (this.hasSkipped(user)) {
        chat.userHasAlreadySkipped(user, text);
      } else if (user.active) {
        chat.userSkipped(user, text);
        this.skippers.push(user.username);
        this.change();
        this.emit("userSkip", user, text);
      } else {
        chat.inactiveUserWantsToSkip(user, text);
      }
    });
  }

  /**
   * Get the skip limit which is currently half the radio users (rounded up)
   * @return {Integer} The skip limit
   */
  getSkipLimit() {
    return Math.ceil(this.userDao.getRadioUsernames().length / 2);
  }

  /**
   * When skippers or users changed we need to decide if a skip should happen
   */
  change() {
    var skippers = this.getSkippers();

    this.logger.info('skippers changed', skippers);

    // tell our listeners that our data has changed
    this.emit("change", this.getData());

    // decide if we need to actually skip
    if (!this.skipProcessed &&
          this.userDao.getRadioUsernames().length > 0 &&
          skippers.length > 0 &&
          skippers.length >= this.getSkipLimit()) {
      this.skipProcessed = true; // make sure we don't call skip twice for the same track
      this.chat.skipSuccessful(skippers);
      this.emit("skip");
    }
  }

  /**
   * Get the current skippers. Only active users are counted as skippers
   * @return {String|Array} The usernames of the skippers
   */
  getSkippers() {
    return this.skippers.filter(skipper => {
      return this.userDao.getRadioUsernames().indexOf(skipper) !== -1;
    });
  }

  /**
   * Get the skip manager data (for sending to the frontend)
   * @return {Object} The skip data. Includes current skippers and skip limit
   */
  getData() {
    return {
      skippers: this.getSkippers(),
      skipLimit: this.getSkipLimit()
    };
  }

  /**
   * Test is the user has skipper
   * @param {Object} user The user to test.
   * @return {Boolean} true if the user has skipper, otherwise false
   */
  hasSkipped(user) {
    return this.skippers.filter(skipper => {
      return skipper === user.username;
    }).length > 0;
  }
};

