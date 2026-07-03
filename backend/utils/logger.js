// backend/utils/logger.js
// Centralised Winston logger. Human-readable console output in development;
// structured JSON (console + rotating files) once NODE_ENV=production.

const fs = require('fs');
const path = require('path');
const winston = require('winston');

const { combine, timestamp, printf, colorize, errors, json } = winston.format;

const isProduction = process.env.NODE_ENV === 'production';
const logLevel = process.env.LOG_LEVEL || (isProduction ? 'info' : 'debug');

// winston's built-in errors() only unwraps an Error passed as the top-level
// log argument (logger.error(err)). This normalises Error instances found
// anywhere in the metadata too, so logger.error('msg', { err }) still keeps
// a readable stack instead of silently serialising to {}.
const normaliseNestedErrors = winston.format((info) => {
  for (const [key, value] of Object.entries(info)) {
    if (value instanceof Error) {
      info[key] = { message: value.message, stack: value.stack };
    }
  }
  return info;
});

const devFormat = combine(
  errors({ stack: true }),
  normaliseNestedErrors(),
  colorize(),
  timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  printf(({ level, message, timestamp: ts, stack, ...meta }) => {
    const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
    return `${ts} [${level}]: ${stack || message}${metaStr}`;
  })
);

const prodFormat = combine(
  errors({ stack: true }),
  normaliseNestedErrors(),
  timestamp(),
  json()
);

// IMPORTANT: format is set once here, at the logger level, not per-transport.
// Applying format per-transport breaks winston's Error-unwrapping for plain
// `logger.error(err)` calls (verified — it silently prints "undefined").
const transports = [new winston.transports.Console()];

// File transports only outside development, so local/dev runs and containers
// don't quietly accumulate log files on disk.
if (isProduction) {
  const logDir = path.join(__dirname, '..', 'logs');
  fs.mkdirSync(logDir, { recursive: true });

  transports.push(
    new winston.transports.File({ filename: path.join(logDir, 'error.log'), level: 'error' }),
    new winston.transports.File({ filename: path.join(logDir, 'combined.log') })
  );
}

const logger = winston.createLogger({
  level: logLevel,
  format: isProduction ? prodFormat : devFormat,
  transports,
  exitOnError: false,
});

// Usage:
//   const logger = require('../utils/logger');
//   logger.info('Server started', { port: 5000 });
//   logger.warn('Fuel sensor reading out of range', { truckId, reading });
//   logger.error(err);                              // err as the log itself — stack captured
//   logger.error('Alert dispatch failed', { err });  // err nested in meta — stack still captured

module.exports = logger;
