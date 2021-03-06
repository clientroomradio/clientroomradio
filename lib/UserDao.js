"use strict";

var uuid = require("node-uuid");
var events = require("events");

module.exports = class UserDao extends events.EventEmitter {
  constructor(dataStore, lastfmClient, socket, config, logger) {
    super();

    this.setMaxListeners(0);

    this.dataStore = dataStore;
    this.lastfmClient = lastfmClient;
    this.socket = socket;
    this.config = config;
    this.logger = logger;

    this.users = dataStore.read("users") || {};

    this.anonymousDisallowedTypes = ["chat"];

    // the data store will save to file every time we emit a change
    dataStore.record(this, "change", "users", ["conn"]);

    socket.on("login", (data, conn) => {
      if (data.session === "") {
        // a client without a session. add them as anonymous
        this.addAnonymousUser(conn);
      } else {
        // this user thinks they're logged in
        var user = this.getUserBySession(data.session);

        if (user) {
          // a user in our list has connected
          user.conn = conn;
          user.timestamp = new Date().getTime();
          socket.newConnectedUser(user, username => this.isValidUsername(username));
          this.usersChanged();
        } else {
          // probably a timed out user add them again as anonymous
          this.addAnonymousUser(conn);
        }
      }
    });

    socket.on("logout", user => {
      // the user has asked to log out so just go back to the anonymous state
      this.emit("left", user);
      this.setAnonymousByUsername(user.username);
      socket.sendToUser(user, "disconnected", null);
    });

    // receive heartbeats from the clients
    socket.on("heartbeat", user => {
      this.users[user.username].timestamp = new Date().getTime();
    });

    socket.on("scrobbleStatus", (user, newValue) => {
      this.setUserScrobbling(user.username, newValue);
    });

    // check that all the users have told us they're still there in the last 5 seconds
    setInterval(() => this.checkHeartbeat(), 5000);
  }

  addAnonymousUser(conn) {
    var fakeSession = uuid.v4();
    var user = this.addUser(fakeSession, fakeSession, null, false);
    user.scrobbling = false;
    user.active = false;
    user.conn = conn;
    this.socket.newConnectedUser(user, username => this.isValidUsername(username));
  }

  isValidUsername(username) {
    return Object.prototype.hasOwnProperty.call(this.users, username);
  }

  getUserConfig(user) {
    return {
      radioname: this.config.radioname,
      username: user.username,
      apiKey: this.config.lfm.apiKey,
      allowed: user.allowed,
      scrobbling: user.scrobbling,
      active: user.active,
      session: user.session
    };
  }

  usersChanged() {
    // update the individual config for each user
    Object.keys(this.users).forEach(username => {
      var user = this.users[username];
      this.socket.sendToUser(user, "config", this.getUserConfig(user));
    });

    // notify everyone that the users have changed
    this.emit("change", this.users);
  }

  checkHeartbeat() {
    var current = new Date().getTime();
    Object.keys(this.users).forEach(username => {
      var user = this.users[username];

      // if the user hasn't reported anything to us in 30 seconds consider them gone
      if (current - 30000 > user.timestamp) {
        this.logger.info("removing timed out user", username);
        this.emit("timedOut", this.users[username]);
        delete this.users[username];
        this.usersChanged();
      }
    });
  }

  getUsers() {
    return this.users;
  }

  isRadioUsername(username) {
    var user = this.users[username];
    return user.sk && user.active && user.allowed;
  }

  getRadioUsernames() {
    return Object.keys(this.users).filter(username => {
      return this.isRadioUsername(username);
    });
  }

  getUsernames() {
    return Object.keys(this.users);
  }

  getScrobbleUsers() {
    var scrobbleUsers = {};

    this.getRadioUsernames().filter(username => {
      return this.users[username].scrobbling;
    }).forEach(username => {
      scrobbleUsers[username] = this.users[username];
    });

    return scrobbleUsers;
  }

  getInfoCallback(err, lfm) {
    if (err) {
      this.logger.error("get info", err);
    } else {
      this.users[lfm.user.name].image = lfm.user.image[2]["#text"];
      this.usersChanged();
    }
  }

  sendStartRadio(oldRadioUsernames) {
    var newRadioUsernames = this.getRadioUsernames();

    if (oldRadioUsernames.length === 0 && newRadioUsernames.length === 1) {
      this.emit("startRadio", newRadioUsernames);
    }
  }

  addUser(username, sessionId, lastfmSessionKey, allowed) {
    var oldRadioUsernames = this.getRadioUsernames();

    var user = {
      username: username,
      allowed: allowed,
      timestamp: new Date().getTime(),
      scrobbling: true,
      active: true,
      muted: false,
      sk: lastfmSessionKey,
      session: sessionId,
      conn: null
    };
    this.users[user.username] = user;
    this.usersChanged();
    this.sendStartRadio(oldRadioUsernames);

    // get some more info about the user
    if (lastfmSessionKey) {
      this.lastfmClient.userGetInfo(username, (err, lfm) => this.getInfoCallback(err, lfm));
    }

    return user;
  }

  setUsersInactive() {
    Object.keys(this.users).forEach(username => {
      this.users[username].active = false;
    });
    this.usersChanged();
  }

  setUserActive(username, active) {
    var oldRadioUsernames = this.getRadioUsernames();
    this.users[username].active = active;
    this.sendStartRadio(oldRadioUsernames);
    this.usersChanged();
  }

  setUserScrobbling(username, scrobbling) {
    this.users[username].scrobbling = scrobbling;
    this.usersChanged();
  }

  setUserMuted(username, muted) {
    this.users[username].muted = muted;
    this.emit("change", this.users);
  }

  setAllowedByUsername(username) {
    if (Object.prototype.hasOwnProperty.call(this.users, username)) {
      this.users[username].allowed = true;
      this.usersChanged();
      this.emit("allowed", this.users[username]);
    }
  }

  setAnonymousByUsername(username) {
    if (Object.prototype.hasOwnProperty.call(this.users, username)) {
      this.users[username].sk = null;
      this.usersChanged();
    }
  }

  removeByUsername(username) {
    if (Object.prototype.hasOwnProperty.call(this.users, username)) {
      this.emit("left", this.users[username]);
      delete this.users[username];
      this.usersChanged();
    }
  }

  getUserBySession(session) {
    var usernames = Object.keys(this.users).filter(username => {
      return this.users[username].session === session;
    });

    return usernames.length > 0 ? this.users[usernames[0]] : null;
  }

  getAllowedUsers() {
    var allowedUsers = {};

    // now remove the anonymous users
    Object.keys(this.users).forEach(username => {
      if (this.users[username].sk) {
        allowedUsers[username] = this.users[username];
      }
    });

    return allowedUsers;
  }

  sendToUsername(username, type, data) {
    this.socket.sendToUser(this.users[username], type, data);
  }

  broadcast(type, data) {
    Object.keys(this.users).forEach(username => {
      var user = this.users[username];
      var anonymousAllowedType = this.anonymousDisallowedTypes.indexOf(type) === -1;
      var userAnonymous = !user.sk || !user.allowed;
      if (anonymousAllowedType || !userAnonymous) {
        // this is a logged in user or the message type can be sent to anyone
        this.sendToUsername(username, type, data);
      }
    });
  }
};
