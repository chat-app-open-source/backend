/* eslint-disable @typescript-eslint/no-explicit-any */
import fs from 'fs';
import path from 'path';
import winston from 'winston';
import 'winston-daily-rotate-file';

// const { combine, timestamp, printf, colorize, errors, json, metadata } = winston.format;
const { combine, timestamp, printf, colorize, errors, json } = winston.format;

const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
  socket: 5,
};

const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'blue',
  socket: 'cyan',
};

winston.addColors(colors);

const logsDir = path.join(process.cwd(), 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Console log format
const consoleFormat = printf(({ level, message, timestamp, stack, ...meta }) => {
  let log = `${timestamp} [${level}]: ${message}`;
  if (stack) log += `\n${stack}`;
  if (Object.keys(meta).length > 0) log += `\n${JSON.stringify(meta, null, 2)}`;
  return log;
});

// File log format
const fileFormat = printf(({ level, message, timestamp, stack, ...meta }) => {
  const logEntry: any = { timestamp, level, message };
  if (stack) logEntry.stack = stack;
  if (Object.keys(meta).length > 0) logEntry.meta = meta;
  return JSON.stringify(logEntry);
});

// Helper to get combined format
const getFormat = (isConsole = false) => {
  const formats = [
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    errors({ stack: true }),
    // metadata({ fillExcept: ['message', 'level', 'timestamp', 'label'] }),
  ];

  if (isConsole) formats.push(colorize(), consoleFormat);
  else formats.push(json());

  return combine(...formats);
};

// Winston logger instance
const logger = winston.createLogger({
  levels,
  level: process.env.LOG_LEVEL || 'info',
  // defaultMeta: { service: 'chat-app-backend' },
  format: getFormat(),
  transports: [
    new winston.transports.Console({ format: getFormat(true) }),

    // Error logs
    new winston.transports.DailyRotateFile({
      filename: path.join(logsDir, 'error-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      level: 'error',
      maxFiles: '30d',
      format: combine(
        timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        errors({ stack: true }),
        fileFormat,
      ),
    }),

    // All logs
    new winston.transports.DailyRotateFile({
      filename: path.join(logsDir, 'combined-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      maxFiles: '30d',
      format: combine(timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }), fileFormat),
    }),

    // HTTP logs
    new winston.transports.DailyRotateFile({
      filename: path.join(logsDir, 'http-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      level: 'http',
      maxFiles: '30d',
      format: combine(timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }), fileFormat),
    }),

    // Socket logs
    new winston.transports.DailyRotateFile({
      filename: path.join(logsDir, 'socket-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      level: 'socket',
      maxFiles: '30d',
      format: combine(timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }), fileFormat),
    }),
  ],
});

// Handle uncaught exceptions
logger.exceptions.handle(
  new winston.transports.DailyRotateFile({
    filename: path.join(logsDir, 'exceptions-%DATE%.log'),
    datePattern: 'YYYY-MM-DD',
    maxFiles: '30d',
  }),
);

// Handle unhandled promise rejections
logger.rejections.handle(
  new winston.transports.DailyRotateFile({
    filename: path.join(logsDir, 'rejections-%DATE%.log'),
    datePattern: 'YYYY-MM-DD',
    maxFiles: '30d',
  }),
);

// Morgan HTTP logger stream
export const morganStream = {
  write: (message: string) => {
    logger.http(message.trim());
  },
};

// Contextual logger factory
export const createLogger = (context: string) => ({
  error: (message: string, meta?: any) => logger.error(message, { ...meta, context }),
  warn: (message: string, meta?: any) => logger.warn(message, { ...meta, context }),
  info: (message: string, meta?: any) => logger.info(message, { ...meta, context }),
  http: (message: string, meta?: any) => logger.http(message, { ...meta, context }),
  debug: (message: string, meta?: any) => logger.debug(message, { ...meta, context }),
  socket: (message: string, meta?: any) => logger.log('socket', message, { ...meta, context }),
});

export const defaultLogger = createLogger('app');

export default logger;
