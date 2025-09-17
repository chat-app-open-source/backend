/* eslint-disable @typescript-eslint/no-explicit-any */
import fs from 'fs';
import path from 'path';
import { config } from 'dotenv';
import winston from 'winston';
import 'winston-daily-rotate-file';

// Load environment variables
config({
  path: path.resolve(process.cwd(), process.env.NODE_ENV === 'dev' ? '.env.dev' : '.env'),
});

const { combine, timestamp, printf, colorize, errors, json, metadata } = winston.format;

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

const consoleFormat = printf(({ level, message, timestamp, stack, ...meta }) => {
  let log = `${timestamp} [${level}]: ${message}`;
  if (stack) log += `\n${stack}`;
  if (Object.keys(meta).length > 0) log += `\n${JSON.stringify(meta, null, 2)}`;
  return log;
});

const fileFormat = printf(({ level, message, timestamp, stack, ...meta }) => {
  const logEntry: any = { timestamp, level, message };
  if (stack) logEntry.stack = stack;
  if (Object.keys(meta).length > 0) logEntry.meta = meta;
  return JSON.stringify(logEntry);
});

// Format function
const getFormat = (isConsole = false) => {
  const formats = [
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    errors({ stack: true }),
    metadata({ fillExcept: ['message', 'level', 'timestamp', 'label'] }),
  ];

  if (isConsole) formats.push(colorize(), consoleFormat);
  else formats.push(json());

  return combine(...formats);
};

const logger = winston.createLogger({
  levels,
  level: process.env.LOG_LEVEL || 'info',
  defaultMeta: { service: 'chat-app-backend' },
  format: getFormat(),
  transports: [
    new winston.transports.Console({ format: getFormat(true) }),
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
    new winston.transports.DailyRotateFile({
      filename: path.join(logsDir, 'combined-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      maxFiles: '30d',
      format: combine(timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }), fileFormat),
    }),
    new winston.transports.DailyRotateFile({
      filename: path.join(logsDir, 'http-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      level: 'http',
      maxFiles: '30d',
      format: combine(timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }), fileFormat),
    }),
    new winston.transports.DailyRotateFile({
      filename: path.join(logsDir, 'socket-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      level: 'socket',
      maxFiles: '30d',
      format: combine(timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }), fileFormat),
    }),
  ],
});

logger.exceptions.handle(
  new winston.transports.DailyRotateFile({
    filename: path.join(logsDir, 'exceptions-%DATE%.log'),
    datePattern: 'YYYY-MM-DD',
    maxFiles: '30d',
  }),
);

logger.rejections.handle(
  new winston.transports.DailyRotateFile({
    filename: path.join(logsDir, 'rejections-%DATE%.log'),
    datePattern: 'YYYY-MM-DD',
    maxFiles: '30d',
  }),
);

if (process.env.NODE_ENV !== 'prod') {
  logger.add(new winston.transports.Console({ format: getFormat(true) }));
}

// Morgan stream
export const morganStream = {
  write: (message: string) => {
    logger.http(message.trim());
  },
};

// Logger factory
export const createLogger = (context: string) => ({
  error: (message: string, meta?: any) => logger.error(message, { ...meta, context }),
  warn: (message: string, meta?: any) => logger.warn(message, { ...meta, context }),
  info: (message: string, meta?: any) => logger.info(message, { ...meta, context }),
  http: (message: string, meta?: any) => logger.http(message, { ...meta, context }),
  debug: (message: string, meta?: any) => logger.debug(message, { ...meta, context }),
  socket: (message: string, meta?: any) => logger.log('socket', message, { ...meta, context }),
});

export const defaultLogger = createLogger('app');

export const requestLogger = (req: any, res: any, next: any) => {
  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;
    const logMeta = {
      method: req.method,
      url: req.url,
      status: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip || req.connection.remoteAddress,
      userAgent: req.get('User-Agent'),
    };
    if (res.statusCode >= 400) logger.warn('HTTP Request', logMeta);
    else logger.http('HTTP Request', logMeta);
  });

  next();
};

export default logger;
