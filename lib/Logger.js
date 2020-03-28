"use strict";

var winston = require("winston");

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  defaultMeta: { service: 'user-service' },
  transports: [
    new winston.transports.File({ filename: '/var/log/crr.winston.log' }),
    new winston.transports.Console({ timestamp: true })
  ]
});

module.exports = class Logger {
  info() {
    logger.info.apply(this, arguments);
  }

  error() {
    logger.error.apply(this, arguments);
  }

  log() {
    logger.log.apply(this, arguments);
  }
};
