import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import { join } from 'path';
import { mkdirSync } from 'fs';

// Create logs directory if it doesn't exist
const logsDir = join(process.cwd(), 'logs');

try {
  mkdirSync(logsDir, { recursive: true });
} catch (error) {
  // If we can't create logs directory, fallback to console-only logging
  if (error instanceof Error && !error.message.includes('EEXIST')) {
    // eslint-disable-next-line no-console
    console.warn(`Warning: Could not create logs directory: ${error.message}`);
  }
}

// Define log format
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

// Console format for development
const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: 'HH:mm:ss' }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    const metaStr = Object.keys(meta).length ? `\n${JSON.stringify(meta, null, 2)}` : '';
    return `${timestamp} [${level}]: ${message}${metaStr}`;
  })
);

// Configure transports based on environment
const transports: winston.transport[] = [];

// Console transport (always active in development)
if (process.env.NODE_ENV !== 'production') {
  transports.push(
    new winston.transports.Console({
      level: 'debug',
      format: consoleFormat,
    })
  );
} else {
  transports.push(
    new winston.transports.Console({
      level: 'info',
      format: logFormat,
    })
  );
}

// File transports with rotation (only when logs directory is accessible)
try {
  transports.push(
    // Error logs
    new DailyRotateFile({
      filename: join(logsDir, 'error-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      level: 'error',
      format: logFormat,
      maxSize: '10m',
      maxFiles: '30d',
      zippedArchive: true,
    }),

    // Combined logs
    new DailyRotateFile({
      filename: join(logsDir, 'combined-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      format: logFormat,
      maxSize: '10m',
      maxFiles: '30d',
      zippedArchive: true,
    })
  );
} catch (error) {
  // eslint-disable-next-line no-console
  console.warn(`Warning: Could not create file log transports: ${error}`);
}

// Create the logger
export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug'),
  format: logFormat,
  defaultMeta: {
    service: 'luppa-api',
    environment: process.env.NODE_ENV || 'development',
  },
  transports,
  // Handle uncaught exceptions and rejections
  exitOnError: false,
});

// Create a stream for morgan HTTP logging middleware
export const httpLogStream = {
  write: (message: string) => {
    logger.info(message.trim(), { source: 'http' });
  },
};
