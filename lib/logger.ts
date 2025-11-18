/**
 * Structured Logging Utility
 * Replaces console.log with production-ready structured logging
 * 
 * Usage:
 *   import logger from '@/lib/logger';
 *   logger.info('User logged in', { userId: '123' });
 *   logger.error('Database error', { error, table: 'users' });
 */

import pino from 'pino';

// Determine log level from environment
// Note: Can't use env.ts here as it runs at module load time
// Using process.env directly is safe here as LOG_LEVEL is optional
const logLevel = process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug');

// Create logger instance
const logger = pino({
  level: logLevel,
  // Pretty print in development, JSON in production
  transport: process.env.NODE_ENV === 'development'
    ? {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'HH:MM:ss Z',
          ignore: 'pid,hostname',
        },
      }
    : undefined,
  // Base context (adds to all logs)
  base: {
    env: process.env.NODE_ENV || 'development',
    service: 'explore-omd',
  },
  // Redact sensitive information
  redact: {
    paths: [
      'password',
      'token',
      'apiKey',
      'secret',
      'authorization',
      'cookie',
      '*.password',
      '*.token',
      '*.apiKey',
      '*.secret',
    ],
    remove: true,
  },
});

// Export typed logger interface
export default logger;

// Export convenience functions for common use cases
export const log = {
  /**
   * Debug level - detailed information for debugging
   */
  debug: (message: string, context?: Record<string, any>) => {
    logger.debug(context || {}, message);
  },

  /**
   * Info level - general informational messages
   */
  info: (message: string, context?: Record<string, any>) => {
    logger.info(context || {}, message);
  },

  /**
   * Warn level - warning messages
   */
  warn: (message: string, context?: Record<string, any>) => {
    logger.warn(context || {}, message);
  },

  /**
   * Error level - error messages
   */
  error: (message: string, error?: Error | unknown, context?: Record<string, any>) => {
    const errorContext: Record<string, any> = {
      ...(context || {}),
    };
    
    if (error !== undefined && error !== null) {
      if (error instanceof Error) {
        errorContext.error = {
          message: error.message,
          stack: error.stack,
          name: error.name,
        };
      } else {
        errorContext.error = String(error);
      }
    }
    
    // Call pino logger with context and message
    (logger as any).error(errorContext, message);
  },

  /**
   * Fatal level - critical errors that may cause the app to crash
   */
  fatal: (message: string, error?: Error | unknown, context?: Record<string, any>) => {
    const errorContext = {
      ...context,
      ...(error instanceof Error
        ? {
            error: {
              message: error.message,
              stack: error.stack,
              name: error.name,
            },
          }
        : { error }),
    };
    logger.fatal(errorContext, message);
  },
};

// Export logger instance for advanced usage
export { logger };

