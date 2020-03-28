"use strict";

var winston = require("winston");

module.exports = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  defaultMeta: { service: 'user-service' },
  transports: [
    new winston.transports.File({ filename: '/var/log/crr.winston.log' }),
    new winston.transports.Console({ timestamp: true })
  ]
});
