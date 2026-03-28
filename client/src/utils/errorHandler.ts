export interface ErrorDetails {
  code: string;
  message: string;
  details?: Record<string, unknown>;
  timestamp: number;
}

export class AppError extends Error {
  code: string;
  details?: Record<string, unknown>;
  timestamp: number;

  constructor(code: string, message: string, details?: Record<string, unknown>) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.details = details;
    this.timestamp = Date.now();
  }

  toErrorDetails(): ErrorDetails {
    return {
      code: this.code,
      message: this.message,
      details: this.details,
      timestamp: this.timestamp,
    };
  }
}

export const ErrorCodes = {
  NETWORK_ERROR: 'NETWORK_ERROR',
  AUTH_ERROR: 'AUTH_ERROR',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  NOT_FOUND: 'NOT_FOUND',
  TIMEOUT_ERROR: 'TIMEOUT_ERROR',
  UNKNOWN_ERROR: 'UNKNOWN_ERROR',
} as const;

export type ErrorCode = typeof ErrorCodes[keyof typeof ErrorCodes];

export const createError = (code: ErrorCode, message: string, details?: Record<string, unknown>): AppError => {
  return new AppError(code, message, details);
};

export const handleFetchError = (error: unknown): ErrorDetails => {
  if (error instanceof AppError) {
    return error.toErrorDetails();
  }

  if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
    return createError(
      ErrorCodes.NETWORK_ERROR,
      '无法连接到服务器，请检查网络连接',
      { originalError: error.message }
    ).toErrorDetails();
  }

  if (error instanceof Error) {
    if (error.name === 'AbortError') {
      return createError(
        ErrorCodes.TIMEOUT_ERROR,
        '请求超时，请重试',
        { originalError: error.message }
      ).toErrorDetails();
    }

    return createError(
      ErrorCodes.UNKNOWN_ERROR,
      error.message || '发生未知错误',
      { originalError: error.message }
    ).toErrorDetails();
  }

  return createError(
    ErrorCodes.UNKNOWN_ERROR,
    '发生未知错误',
    { originalError: String(error) }
  ).toErrorDetails();
};

export const formatErrorForDisplay = (errorDetails: ErrorDetails): string => {
  let message = errorDetails.message;
  
  if (errorDetails.code === ErrorCodes.NETWORK_ERROR) {
    message = '无法连接到服务器，请检查网络连接和API地址配置';
  } else if (errorDetails.code === ErrorCodes.AUTH_ERROR) {
    message = '认证失败，请重新登录';
  } else if (errorDetails.code === ErrorCodes.TIMEOUT_ERROR) {
    message = '请求超时，请检查网络后重试';
  }

  return message;
};
