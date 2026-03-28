export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
}

export interface LoggerOptions {
  level?: LogLevel;
  context?: string;
  metadata?: Record<string, unknown>;
}

export class Logger {
  private level: LogLevel;

  constructor(level: LogLevel = LogLevel.INFO) {
    this.level = level;
  }

  private shouldLog(level: LogLevel): boolean {
    const levels = [LogLevel.DEBUG, LogLevel.INFO, LogLevel.WARN, LogLevel.ERROR];
    return levels.indexOf(level) >= levels.indexOf(this.level);
  }

  private log(level: LogLevel, message: string, options: LoggerOptions = {}): void {
    if (!this.shouldLog(level)) {
      return;
    }

    // Create JSON log object
    const logObject = {
      timestamp: new Date().toISOString(),
      level: level.toUpperCase(),
      message,
      context: options.context,
      metadata: options.metadata,
    };

    // Convert to JSON string
    const logMessage = JSON.stringify(logObject);

    switch (level) {
      case LogLevel.DEBUG:
        console.debug(logMessage);
        break;
      case LogLevel.INFO:
        console.log(logMessage);
        break;
      case LogLevel.WARN:
        console.warn(logMessage);
        break;
      case LogLevel.ERROR:
        console.error(logMessage);
        break;
    }
  }

  debug(message: string, options?: LoggerOptions): void {
    this.log(LogLevel.DEBUG, message, options);
  }

  info(message: string, options?: LoggerOptions): void {
    this.log(LogLevel.INFO, message, options);
  }

  warn(message: string, options?: LoggerOptions): void {
    this.log(LogLevel.WARN, message, options);
  }

  error(message: string, options?: LoggerOptions): void {
    this.log(LogLevel.ERROR, message, options);
  }

  setLevel(level: LogLevel): void {
    this.level = level;
  }

  getLevel(): LogLevel {
    return this.level;
  }
}

// Export default logger
export const logger = new Logger();
