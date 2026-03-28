export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
  FATAL = 'fatal'
}

interface LogOptions {
  timestamp?: boolean;
  context?: string;
  metadata?: Record<string, any>;
  stack?: string;
}

class Logger {
  private logLevel: LogLevel;

  constructor(level: LogLevel = LogLevel.INFO) {
    // 从环境变量读取日志级别
    const envLevel = process.env.LOG_LEVEL as LogLevel;
    if (envLevel && Object.values(LogLevel).includes(envLevel)) {
      this.logLevel = envLevel;
    } else {
      this.logLevel = level;
    }
  }

  private getTimestamp(): string {
    return new Date().toISOString();
  }

  private shouldLog(level: LogLevel): boolean {
    const levels = [LogLevel.DEBUG, LogLevel.INFO, LogLevel.WARN, LogLevel.ERROR, LogLevel.FATAL];
    return levels.indexOf(level) >= levels.indexOf(this.logLevel);
  }

  private log(level: LogLevel, message: string, options: LogOptions = {}): void {
    if (!this.shouldLog(level)) {
      return;
    }

    const timestamp = options.timestamp !== false ? this.getTimestamp() : new Date().toISOString();
    const context = options.context;
    const metadata = options.metadata;
    const stack = options.stack;

    // 输出JSON格式日志
    const logObject = {
      timestamp,
      level: level.toUpperCase(),
      message,
      ...(context && { context }),
      ...(metadata && { metadata }),
      ...(stack && { stack })
    };

    const logMessage = JSON.stringify(logObject);

    switch (level) {
      case LogLevel.DEBUG:
      case LogLevel.INFO:
        console.log(logMessage);
        break;
      case LogLevel.WARN:
        console.warn(logMessage);
        break;
      case LogLevel.ERROR:
      case LogLevel.FATAL:
        console.error(logMessage);
        break;
    }
  }

  debug(message: string, options?: LogOptions): void {
    this.log(LogLevel.DEBUG, message, options);
  }

  info(message: string, options?: LogOptions): void {
    this.log(LogLevel.INFO, message, options);
  }

  warn(message: string, options?: LogOptions): void {
    this.log(LogLevel.WARN, message, options);
  }

  error(message: string, options?: LogOptions): void {
    // 自动捕获堆栈信息
    const stack = options?.stack || new Error().stack;
    this.log(LogLevel.ERROR, message, { ...options, stack });
  }

  fatal(message: string, options?: LogOptions): void {
    // 自动捕获堆栈信息
    const stack = options?.stack || new Error().stack;
    this.log(LogLevel.FATAL, message, { ...options, stack });
  }

  setLevel(level: LogLevel): void {
    this.logLevel = level;
  }

  getLevel(): LogLevel {
    return this.logLevel;
  }

  // 创建子logger，继承上下文
  child(context: string): Logger {
    const childLogger = new Logger(this.logLevel);
    // 重写log方法，自动添加上下文
    const originalLog = childLogger.log;
    childLogger.log = (level, message, options = {}) => {
      originalLog.call(childLogger, level, message, {
        ...options,
        context: options.context || context
      });
    };
    return childLogger;
  }
}

export const logger = new Logger();
export default logger;