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

    const timestamp = new Date().toISOString();
    const context = options.context ? `[${options.context}] ` : '';
    const metadata = options.metadata ? ` ${JSON.stringify(options.metadata)}` : '';

    const logMessage = `${timestamp} ${level.toUpperCase()} ${context}${message}${metadata}`;

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
