const winston = require('winston');

const config = require('../config');

const logger = winston.createLogger({
  level: config.isTest ? 'error' : config.isProduction ? 'info' : 'debug',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json(),
  ),
  transports: [new winston.transports.Console()],
});

module.exports = logger;
