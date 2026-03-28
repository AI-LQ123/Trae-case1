import {
  AppError,
  ErrorCodes,
  createError,
  handleFetchError,
  formatErrorForDisplay,
  ErrorDetails,
} from './errorHandler';

describe('errorHandler', () => {
  describe('AppError', () => {
    it('should create an AppError with correct properties', () => {
      const error = new AppError(
        ErrorCodes.NETWORK_ERROR,
        'Network connection failed',
        { url: 'https://api.example.com' }
      );

      expect(error.name).toBe('AppError');
      expect(error.code).toBe(ErrorCodes.NETWORK_ERROR);
      expect(error.message).toBe('Network connection failed');
      expect(error.details).toEqual({ url: 'https://api.example.com' });
      expect(error.timestamp).toBeDefined();
      expect(typeof error.timestamp).toBe('number');
    });

    it('should convert to ErrorDetails', () => {
      const error = new AppError(
        ErrorCodes.AUTH_ERROR,
        'Authentication failed'
      );

      const details = error.toErrorDetails();

      expect(details.code).toBe(ErrorCodes.AUTH_ERROR);
      expect(details.message).toBe('Authentication failed');
      expect(details.timestamp).toBe(error.timestamp);
    });
  });

  describe('createError', () => {
    it('should create an AppError using factory function', () => {
      const error = createError(
        ErrorCodes.TIMEOUT_ERROR,
        'Request timeout',
        { timeout: 30000 }
      );

      expect(error).toBeInstanceOf(AppError);
      expect(error.code).toBe(ErrorCodes.TIMEOUT_ERROR);
      expect(error.details).toEqual({ timeout: 30000 });
    });
  });

  describe('handleFetchError', () => {
    it('should handle AppError', () => {
      const originalError = new AppError(
        ErrorCodes.VALIDATION_ERROR,
        'Invalid input'
      );

      const result = handleFetchError(originalError);

      expect(result.code).toBe(ErrorCodes.VALIDATION_ERROR);
      expect(result.message).toBe('Invalid input');
    });

    it('should handle network error (TypeError)', () => {
      const originalError = new TypeError('Failed to fetch');

      const result = handleFetchError(originalError);

      expect(result.code).toBe(ErrorCodes.NETWORK_ERROR);
      expect(result.message).toBe('无法连接到服务器，请检查网络连接');
      expect(result.details?.originalError).toBe('Failed to fetch');
    });

    it('should handle timeout error (AbortError)', () => {
      const originalError = new Error('Request timeout');
      originalError.name = 'AbortError';

      const result = handleFetchError(originalError);

      expect(result.code).toBe(ErrorCodes.TIMEOUT_ERROR);
      expect(result.message).toBe('请求超时，请重试');
    });

    it('should handle generic Error', () => {
      const originalError = new Error('Something went wrong');

      const result = handleFetchError(originalError);

      expect(result.code).toBe(ErrorCodes.UNKNOWN_ERROR);
      expect(result.message).toBe('Something went wrong');
    });

    it('should handle unknown error type', () => {
      const result = handleFetchError('unknown error');

      expect(result.code).toBe(ErrorCodes.UNKNOWN_ERROR);
      expect(result.message).toBe('发生未知错误');
    });
  });

  describe('formatErrorForDisplay', () => {
    it('should format network error', () => {
      const errorDetails: ErrorDetails = {
        code: ErrorCodes.NETWORK_ERROR,
        message: 'Network error',
        timestamp: Date.now(),
      };

      const result = formatErrorForDisplay(errorDetails);

      expect(result).toBe('无法连接到服务器，请检查网络连接和API地址配置');
    });

    it('should format auth error', () => {
      const errorDetails: ErrorDetails = {
        code: ErrorCodes.AUTH_ERROR,
        message: 'Auth failed',
        timestamp: Date.now(),
      };

      const result = formatErrorForDisplay(errorDetails);

      expect(result).toBe('认证失败，请重新登录');
    });

    it('should format timeout error', () => {
      const errorDetails: ErrorDetails = {
        code: ErrorCodes.TIMEOUT_ERROR,
        message: 'Timeout',
        timestamp: Date.now(),
      };

      const result = formatErrorForDisplay(errorDetails);

      expect(result).toBe('请求超时，请检查网络后重试');
    });

    it('should return original message for other errors', () => {
      const errorDetails: ErrorDetails = {
        code: ErrorCodes.VALIDATION_ERROR,
        message: 'Validation failed',
        timestamp: Date.now(),
      };

      const result = formatErrorForDisplay(errorDetails);

      expect(result).toBe('Validation failed');
    });
  });

  describe('ErrorCodes', () => {
    it('should have all expected error codes', () => {
      expect(ErrorCodes.NETWORK_ERROR).toBe('NETWORK_ERROR');
      expect(ErrorCodes.AUTH_ERROR).toBe('AUTH_ERROR');
      expect(ErrorCodes.VALIDATION_ERROR).toBe('VALIDATION_ERROR');
      expect(ErrorCodes.NOT_FOUND).toBe('NOT_FOUND');
      expect(ErrorCodes.TIMEOUT_ERROR).toBe('TIMEOUT_ERROR');
      expect(ErrorCodes.UNKNOWN_ERROR).toBe('UNKNOWN_ERROR');
    });
  });
});
