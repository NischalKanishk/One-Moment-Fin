import { existsSync, mkdirSync } from 'fs';
import path from 'path';
import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';

// Ensure logs directory exists
const logsDir = path.join(__dirname, '../../logs');
if (!existsSync(logsDir)) {
  mkdirSync(logsDir, { recursive: true });
}

const jsonFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

const minuteRotateTransport = new DailyRotateFile({
  dirname: logsDir,
  filename: 'app-%DATE%.log',
  datePattern: 'YYYY-MM-DD-HH-mm', // rotate every minute
  // Keep only the last 10 files (with per-minute rotation, that's ~10 minutes)
  maxFiles: '10',
  zippedArchive: false,
  level: 'info',
});

export const logger = winston.createLogger({
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  format: jsonFormat,
  transports: [
    minuteRotateTransport,
  ],
});

// Console transport in non-production for developer visibility
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    level: 'debug',
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.timestamp(),
      winston.format.printf(({ level, message, timestamp, ...meta }) => {
        const rest = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
        return `${timestamp} ${level}: ${message}${rest}`;
      })
    )
  }));
}

export function httpLoggerFormat(tokens: any, req: any, res: any) {
  return JSON.stringify({
    time: new Date().toISOString(),
    method: req.method,
    url: req.originalUrl || req.url,
    status: res.statusCode,
    contentLength: tokens.res(req, res, 'content-length'),
    responseTimeMs: Number(tokens['response-time'](req, res)),
    ip: req.ip,
    userAgent: req.get('user-agent'),
  });
}

export function logAuthEvent(event: string, details?: Record<string, unknown>) {
  logger.info('AUTH_EVENT', { event, ...details });
}

export function logSecurityEvent(event: string, details?: Record<string, unknown>) {
  logger.warn('SECURITY_EVENT', { event, ...details });
}

