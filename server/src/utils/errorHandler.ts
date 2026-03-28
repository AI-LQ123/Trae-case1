import { logger } from './logger';

export enum ErrorCode {
  // 系统错误
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  NETWORK_ERROR = 'NETWORK_ERROR',
  DATABASE_ERROR = 'DATABASE_ERROR',
  
  // 认证错误
  UNAUTHORIZED = 'UNAUTHORIZED',
  INVALID_TOKEN = 'INVALID_TOKEN',
  EXPIRED_TOKEN = 'EXPIRED_TOKEN',
  
  // 业务错误
  BAD_REQUEST = 'BAD_REQUEST',
  NOT_FOUND = 'NOT_FOUND',
  CONFLICT = 'CONFLICT',
  
  // WebSocket错误
  WS_CONNECTION_ERROR = 'WS_CONNECTION_ERROR',
  WS_MESSAGE_ERROR = 'WS_MESSAGE_ERROR',
  WS_AUTH_ERROR = 'WS_AUTH_ERROR'
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
  error: {
    message: string;
    code: string;
    statusCode: number;
    metadata?: Record<string, any>;
  };
  timestamp: string;
  path?: string;
}

export function createErrorResponse(
  error: Error | AppError,
  path?: string
): ErrorResponse {
  if (error instanceof AppError) {
    return {
      error: {
        message: error.message,
        code: error.code,
        statusCode: error.statusCode,
        metadata: error.metadata
      },
      timestamp: new Date().toISOString(),
      path
    };
  }

  return {
    error: {
      message: error.message || 'Internal Server Error',
      code: ErrorCode.INTERNAL_ERROR,
      statusCode: 500
    },
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
    switch (error.code) {
      case ErrorCode.INTERNAL_ERROR:
      case ErrorCode.DATABASE_ERROR:
      case ErrorCode.NETWORK_ERROR:
        logger.error(error.message, {
          context,
          metadata: { ...metadata, ...error.metadata, code: error.code }
        });
        break;
      case ErrorCode.UNAUTHORIZED:
      case ErrorCode.INVALID_TOKEN:
      case ErrorCode.EXPIRED_TOKEN:
        logger.warn(error.message, {
          context,
          metadata: { ...metadata, ...error.metadata, code: error.code }
        });
        break;
      default:
        logger.error(error.message, {
          context,
          metadata: { ...metadata, ...error.metadata, code: error.code }
        });
    }
  } else {
    logger.error(error.message, {
      context,
      metadata: { ...metadata, stack: error.stack }
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
      params: req.params
    });

    res.status(errorResponse.error.statusCode).json(errorResponse);
  };
}

export function createWebSocketErrorHandler() {
  return (error: Error | AppError, connectionId: string) => {
    handleError(error, 'WebSocket', { connectionId });
    
    return createErrorResponse(error);
  };
}