import { logger } from './logger';

export enum ErrorCode {
  // 通用错误码
  BAD_REQUEST = 400,
  UNAUTHORIZED = 401,
  FORBIDDEN = 403,
  NOT_FOUND = 404,
  TOO_MANY_REQUESTS = 429,
  INTERNAL_ERROR = 500,
  SERVICE_UNAVAILABLE = 503,
  
  // 认证相关错误码
  INVALID_PAIRING_CODE = 1001,
  EXPIRED_PAIRING_CODE = 1002,
  INVALID_TOKEN = 1003,
  EXPIRED_TOKEN = 1004,
  INVALID_REFRESH_TOKEN = 1005,
  DEVICE_REMOVED = 1006,
  DEVICE_LOCKED = 1007,
  
  // WebSocket相关错误码
  WS_CONNECTION_TIMEOUT = 2001,
  WS_CONNECTION_REFUSED = 2002,
  WS_MESSAGE_FORMAT_ERROR = 2003,
  WS_MESSAGE_PROCESSING_ERROR = 2004,
  WS_HEARTBEAT_TIMEOUT = 2005,
  WS_SERVER_CLOSED = 2006,
  WS_MESSAGE_TOO_LARGE = 2007,
  
  // 终端相关错误码
  TERMINAL_SESSION_NOT_FOUND = 3001,
  TERMINAL_CREATION_FAILED = 3002,
  COMMAND_EXECUTION_FAILED = 3003,
  TERMINAL_SESSION_CLOSED = 3004,
  TERMINAL_OUTPUT_TIMEOUT = 3005,
  
  // 任务相关错误码
  TASK_NOT_FOUND = 4001,
  TASK_CREATION_FAILED = 4002,
  TASK_OPERATION_FAILED = 4003,
  TASK_EXECUTION_TIMEOUT = 4004,
  TASK_PERMISSION_DENIED = 4005,
  
  // 文件相关错误码
  FILE_NOT_FOUND = 5001,
  DIRECTORY_NOT_FOUND = 5002,
  FILE_READ_FAILED = 5003,
  FILE_TOO_LARGE = 5004,
  INVALID_FILE_PATH = 5005,
  
  // AI服务相关错误码
  AI_SERVICE_UNAVAILABLE = 6001,
  AI_SESSION_NOT_FOUND = 6002,
  AI_MESSAGE_SEND_FAILED = 6003,
  AI_STREAM_INTERRUPTED = 6004,
  AI_SERVICE_TIMEOUT = 6005,
  AI_CONTENT_BLOCKED = 6006
}

export class AppError extends Error {
  public code: ErrorCode;
  public statusCode: number;
  public metadata?: Record<string, any>;

  constructor(
    message: string,
    code: ErrorCode,
    statusCode: number = 500,
    metadata?: Record<string, any>
  ) {
    super(message);
    this.code = code;
    this.statusCode = statusCode;
    this.metadata = metadata;
    this.name = 'AppError';

    Error.captureStackTrace(this, this.constructor);
  }
}

interface ErrorResponse {
  success: boolean;
  error: string;
  code: number;
  details?: any;
  timestamp?: string;
  path?: string;
}

// 敏感信息过滤函数
function filterSensitiveInfo(obj: Record<string, any> | undefined): Record<string, any> | undefined {
  if (!obj) return obj;
  
  const sensitiveKeys = ['token', 'password', 'secret', 'key', 'credential'];
  const filtered: Record<string, any> = {};
  
  for (const [key, value] of Object.entries(obj)) {
    if (sensitiveKeys.some(sensitiveKey => 
      key.toLowerCase().includes(sensitiveKey)
    )) {
      filtered[key] = '***REDACTED***';
    } else if (typeof value === 'object' && value !== null) {
      filtered[key] = filterSensitiveInfo(value as Record<string, any>);
    } else {
      filtered[key] = value;
    }
  }
  
  return filtered;
}

export function createErrorResponse(
  error: Error | AppError,
  path?: string
): ErrorResponse {
  if (error instanceof AppError) {
    return {
      success: false,
      error: error.message,
      code: error.code,
      details: filterSensitiveInfo(error.metadata),
      timestamp: new Date().toISOString(),
      path
    };
  }

  return {
    success: false,
    error: error.message || 'Internal Server Error',
    code: ErrorCode.INTERNAL_ERROR,
    details: { stack: error.stack },
    timestamp: new Date().toISOString(),
    path
  };
}

export function handleError(
  error: Error | AppError,
  context?: string,
  metadata?: Record<string, any>
): void {
  const errorResponse = createErrorResponse(error);
  
  if (error instanceof AppError) {
    // 根据错误类型选择日志级别
    const isAuthError = [
      ErrorCode.UNAUTHORIZED,
      ErrorCode.INVALID_TOKEN,
      ErrorCode.EXPIRED_TOKEN,
      ErrorCode.INVALID_PAIRING_CODE,
      ErrorCode.EXPIRED_PAIRING_CODE
    ].includes(error.code);
    
    const logFn = isAuthError ? logger.warn : logger.error;
    
    logFn(error.message, {
      context,
      metadata: filterSensitiveInfo({ ...metadata, ...error.metadata, code: error.code })
    });
  } else {
    logger.error(error.message, {
      context,
      metadata: filterSensitiveInfo({ ...metadata, stack: error.stack })
    });
  }
}

export function createHttpErrorHandler() {
  return (error: Error | AppError, req: any, res: any, next: any) => {
    const errorResponse = createErrorResponse(error, req.path);
    
    handleError(error, 'HTTP', {
      method: req.method,
      path: req.path,
      query: req.query,
      params: req.params,
      body: filterSensitiveInfo(req.body)
    });

    const statusCode = error instanceof AppError ? error.statusCode : 500;
    res.status(statusCode).json(errorResponse);
  };
}

export function createWebSocketErrorHandler() {
  return (error: Error | AppError, connectionId: string) => {
    handleError(error, 'WebSocket', { connectionId });
    
    const errorResponse = createErrorResponse(error);
    
    // WebSocket错误消息格式
    return {
      type: 'event' as const,
      id: `error-${Date.now()}`,
      timestamp: Date.now(),
      deviceId: 'server',
      payload: {
        category: 'error' as const,
        data: {
          code: errorResponse.code,
          message: errorResponse.error,
          details: errorResponse.details
        }
      }
    };
  };
}

// 全局异常捕获
export function setupGlobalErrorHandlers() {
  // 未捕获的异常
  process.on('uncaughtException', (error) => {
    handleError(error, 'Global', { type: 'uncaughtException' });
    // 记录致命错误后延迟退出，确保日志写入完成
    logger.fatal('Uncaught exception, exiting...');
    setTimeout(() => process.exit(1), 1000);
  });

  // 未处理的Promise拒绝
  process.on('unhandledRejection', (reason, promise) => {
    const error = reason instanceof Error ? reason : new Error(String(reason));
    handleError(error, 'Global', { type: 'unhandledRejection' });
  });
}