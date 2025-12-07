import winston from 'winston';
import path from 'path';

/**
 * Structured Logger using Winston
 * 
 * Provides consistent logging across the application with:
 * - Multiple log levels (error, warn, info, debug)
 * - Console output for development
 * - File output for production
 * - Timestamps and metadata
 */

const logDir = path.join(process.cwd(), 'logs');

// Custom format for console output (colorized and readable)
const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.printf(({ timestamp, level, message, ...metadata }) => {
    let msg = `${timestamp} [${level}]: ${message}`;
    
    // Add metadata if present
    if (Object.keys(metadata).length > 0) {
      msg += ` ${JSON.stringify(metadata)}`;
    }
    
    return msg;
  })
);

// Format for file output (JSON for easy parsing)
const fileFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

/**
 * Create Winston logger instance
 */
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.errors({ stack: true }),
  defaultMeta: {
    service: 'the-platform',
    environment: process.env.NODE_ENV || 'development',
  },
  transports: [
    // Console transport (always enabled)
    new winston.transports.Console({
      format: consoleFormat,
    }),
  ],
});

// Add file transports in production
if (process.env.NODE_ENV === 'production') {
  logger.add(
    new winston.transports.File({
      filename: path.join(logDir, 'error.log'),
      level: 'error',
      format: fileFormat,
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    })
  );

  logger.add(
    new winston.transports.File({
      filename: path.join(logDir, 'combined.log'),
      format: fileFormat,
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    })
  );
}

/**
 * Log with context
 * Adds additional metadata to log entries
 */
export function logWithContext(level: string, message: string, context?: Record<string, any>) {
  logger.log(level, message, context);
}

/**
 * Log HTTP requests
 */
export function logRequest(req: any) {
  logger.info('HTTP Request', {
    method: req.method,
    url: req.url,
    ip: req.ip,
    userAgent: req.get('user-agent'),
    userId: req.user?.id,
  });
}

/**
 * Log HTTP responses
 */
export function logResponse(req: any, res: any, duration: number) {
  logger.info('HTTP Response', {
    method: req.method,
    url: req.url,
    statusCode: res.statusCode,
    duration: `${duration}ms`,
    userId: req.user?.id,
  });
}

/**
 * Log errors with stack trace
 */
export function logError(error: Error, context?: Record<string, any>) {
  logger.error(error.message, {
    stack: error.stack,
    ...context,
  });
}

/**
 * Log service initialization
 */
export function logServiceInit(serviceName: string) {
  logger.info(`Service initialized: ${serviceName}`);
}

/**
 * Log service health check
 */
export function logHealthCheck(serviceName: string, healthy: boolean) {
  const level = healthy ? 'info' : 'warn';
  logger.log(level, `Health check: ${serviceName}`, { healthy });
}

export default logger;
