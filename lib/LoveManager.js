"use strict";

module.exports = class LoveManager {
    constructor(socket, currentTrackManager, chat, lastfmClient, logger) {
        this.currentTrackManager = currentTrackManager;
        this.chat = chat;
        this.lastfmClient = lastfmClient;
        this.logger = logger;

        socket.on("love", user => this.update(user, true));
        socket.on("unlove", user => this.update(user, false));
    }

    update(user, loveFlag) {
        this.logger.info("love updating...", user.username, loveFlag);

        this.lastfmClient.setLoveStatus(user, this.currentTrackManager.getCurrentTrack(), loveFlag, (lfm, err) => {
            if (err) {
                this.logger.error("love update error", user.username, loveFlag, err);
            } else {
                this.logger.info("love updated", lfm, user.username, loveFlag);

                if (loveFlag) {
                    this.chat.userLoved(user);
                } else {
                    this.chat.userUnloved(user);
                }
                this.currentTrackManager.updateLoveFlag(user.username, loveFlag ? "1" : "0");
            }
        });
    }
};
