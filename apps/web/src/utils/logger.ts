/**
 * Frontend Logger Utility
 *
 * Provides consistent logging across the frontend application
 */

/* eslint-disable no-console */

interface LogContext {
  [key: string]: unknown;
}

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

class Logger {
  private isDevelopment = this.detectDevelopmentEnvironment();
  private enabledLevels: LogLevel[] = this.isDevelopment
    ? ['debug', 'info', 'warn', 'error']
    : ['warn', 'error'];

  private detectDevelopmentEnvironment(): boolean {
    // Check various indicators of development environment
    try {
      // Primary check: NODE_ENV
      if (typeof process !== 'undefined' && process.env?.NODE_ENV) {
        return process.env.NODE_ENV === 'development';
      }

      // Fallback checks for browser environments
      if (typeof window !== 'undefined') {
        // Check if running on localhost or common dev ports
        const hostname = window.location?.hostname;
        const port = window.location?.port;

        if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '0.0.0.0') {
          return true;
        }

        // Check for common development ports
        if (port && ['3000', '3001', '5173', '8080', '8081'].includes(port)) {
          return true;
        }

        // Check for development indicators in URL
        if (hostname?.includes('dev') || hostname?.includes('local')) {
          return true;
        }
      }

      // Default to production for safety
      return false;
    } catch {
      // If any error occurs, assume production for safety
      return false;
    }
  }

  private formatMessage(level: LogLevel, message: string, context?: LogContext): string {
    const timestamp = new Date().toISOString();
    const prefix = `[${timestamp}] [${level.toUpperCase()}]`;

    if (context && Object.keys(context).length > 0) {
      return `${prefix} ${message} ${JSON.stringify(context)}`;
    }

    return `${prefix} ${message}`;
  }

  private shouldLog(level: LogLevel): boolean {
    return this.enabledLevels.includes(level);
  }

  debug(message: string, context?: LogContext): void {
    if (this.shouldLog('debug')) {
      console.debug(this.formatMessage('debug', message, context));
    }
  }

  info(message: string, context?: LogContext): void {
    if (this.shouldLog('info')) {
      console.info(this.formatMessage('info', message, context));
    }
  }

  warn(message: string, context?: LogContext): void {
    if (this.shouldLog('warn')) {
      console.warn(this.formatMessage('warn', message, context));
    }
  }

  error(message: string, context?: LogContext): void {
    if (this.shouldLog('error')) {
      console.error(this.formatMessage('error', message, context));
    }
  }
}

export const logger = new Logger();
