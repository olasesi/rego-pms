import path from 'path';
import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import { config } from './env';

interface LogMeta {
  requestId?: string;
  userId?: string | number;
  [key: string]: unknown;
}

const logDir = path.resolve(process.cwd(), config.LOG_DIR);

const enumerateErrorFormat = winston.format((info) => {
  if (info instanceof Error) {
    return { ...info, message: info.message, stack: info.stack };
  }
  if (info.message instanceof Error) {
    return { ...info, message: info.message.message, stack: info.message.stack };
  }
  return info;
});

const consoleFormat = winston.format.combine(
  winston.format.colorize({ colors: { info: 'green', warn: 'yellow', error: 'red', debug: 'cyan' } }),
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
  winston.format.printf(({ level, message, timestamp, requestId, ...rest }) => {
    const meta = Object.keys(rest).length ? ` ${JSON.stringify(rest)}` : '';
    return `[${timestamp}] ${level}: ${message as string}${requestId ? ` (req=${requestId as string})` : ''}${meta}`;
  }),
);

const jsonFormat = winston.format.combine(
  enumerateErrorFormat(),
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.json(),
);

const transports: winston.transport[] = [
  new winston.transports.Console({
    level: config.NODE_ENV === 'production' ? 'info' : 'debug',
    format: config.isProduction ? jsonFormat : consoleFormat,
  }),
];

if (!config.isTest) {
  transports.push(
    new DailyRotateFile({
      dirname: path.join(logDir, 'app'),
      filename: 'application-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      maxSize: '20m',
      maxFiles: '14d',
      level: config.LOG_LEVEL as string,
      format: jsonFormat,
    }),
    new DailyRotateFile({
      dirname: path.join(logDir, 'error'),
      filename: 'error-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      maxSize: '20m',
      maxFiles: '30d',
      level: 'error',
      format: jsonFormat,
    }),
  );
}

export const logger = winston.createLogger({
  level: config.LOG_LEVEL,
  transports,
  exitOnError: false,
});

export const httpLogger = logger.child({ label: 'http' });

export const log = {
  info: (message: string | Error, meta?: LogMeta) => logger.info(message instanceof Error ? message.message : message, meta),
  warn: (message: string | Error, meta?: LogMeta) => logger.warn(message instanceof Error ? message.message : message, meta),
  error: (message: string | Error, meta?: LogMeta) => logger.error(message instanceof Error ? message.message : message, meta),
  debug: (message: string | Error, meta?: LogMeta) => logger.debug(message instanceof Error ? message.message : message, meta),
};

export default logger;