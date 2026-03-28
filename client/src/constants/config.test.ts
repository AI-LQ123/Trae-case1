import {
  getEnvConfig,
  validateEnvConfig,
  enforceSecureConnection,
  EnvConfig,
} from './config';

describe('config', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    // 重置环境变量
    process.env = { ...originalEnv };
    delete process.env.EXPO_PUBLIC_API_BASE_URL;
    delete process.env.EXPO_PUBLIC_WS_BASE_URL;
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('getEnvConfig', () => {
    it('should return default config when env vars are not set', () => {
      const config = getEnvConfig();
      
      expect(config.API_BASE_URL).toBe('http://localhost:3000/api');
      expect(config.WS_BASE_URL).toBe('ws://localhost:3001');
      expect(config.isSecure).toBe(false);
    });

    it('should return custom config when env vars are set', () => {
      process.env.EXPO_PUBLIC_API_BASE_URL = 'https://api.example.com/api';
      process.env.EXPO_PUBLIC_WS_BASE_URL = 'wss://ws.example.com';
      
      const config = getEnvConfig();
      
      expect(config.API_BASE_URL).toBe('https://api.example.com/api');
      expect(config.WS_BASE_URL).toBe('wss://ws.example.com');
      expect(config.isSecure).toBe(true);
    });

    it('should detect insecure connection when only one protocol is secure', () => {
      process.env.EXPO_PUBLIC_API_BASE_URL = 'https://api.example.com/api';
      process.env.EXPO_PUBLIC_WS_BASE_URL = 'ws://ws.example.com';
      
      const config = getEnvConfig();
      
      expect(config.isSecure).toBe(false);
    });
  });

  describe('validateEnvConfig', () => {
    it('should return valid for default config in development', () => {
      const result = validateEnvConfig();
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.warnings).toHaveLength(1); // 开发环境使用非安全连接的警告
    });

    it('should return invalid for empty API_BASE_URL', () => {
      process.env.EXPO_PUBLIC_API_BASE_URL = '';
      
      const result = validateEnvConfig();
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('API_BASE_URL 未配置');
    });

    it('should return invalid for empty WS_BASE_URL', () => {
      process.env.EXPO_PUBLIC_WS_BASE_URL = '';
      
      const result = validateEnvConfig();
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('WS_BASE_URL 未配置');
    });

    it('should return invalid for malformed API_BASE_URL', () => {
      process.env.EXPO_PUBLIC_API_BASE_URL = 'invalid-url';
      
      const result = validateEnvConfig();
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('API_BASE_URL 格式错误，必须以 http:// 或 https:// 开头');
    });

    it('should return invalid for malformed WS_BASE_URL', () => {
      process.env.EXPO_PUBLIC_WS_BASE_URL = 'invalid-url';
      
      const result = validateEnvConfig();
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('WS_BASE_URL 格式错误，必须以 ws:// 或 wss:// 开头');
    });

    it('should return valid for secure config', () => {
      process.env.EXPO_PUBLIC_API_BASE_URL = 'https://api.example.com/api';
      process.env.EXPO_PUBLIC_WS_BASE_URL = 'wss://ws.example.com';
      
      const result = validateEnvConfig();
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.warnings).toHaveLength(0);
    });
  });

  describe('enforceSecureConnection', () => {
    const originalDev = __DEV__;

    afterEach(() => {
      Object.defineProperty(global, '__DEV__', {
        value: originalDev,
        writable: true,
      });
    });

    it('should return true in development mode regardless of config', () => {
      Object.defineProperty(global, '__DEV__', {
        value: true,
        writable: true,
      });
      
      const result = enforceSecureConnection();
      
      expect(result).toBe(true);
    });

    it('should return true in production with secure config', () => {
      Object.defineProperty(global, '__DEV__', {
        value: false,
        writable: true,
      });
      
      process.env.EXPO_PUBLIC_API_BASE_URL = 'https://api.example.com/api';
      process.env.EXPO_PUBLIC_WS_BASE_URL = 'wss://ws.example.com';
      
      const result = enforceSecureConnection();
      
      expect(result).toBe(true);
    });

    it('should return false in production with insecure config', () => {
      Object.defineProperty(global, '__DEV__', {
        value: false,
        writable: true,
      });
      
      process.env.EXPO_PUBLIC_API_BASE_URL = 'http://api.example.com/api';
      process.env.EXPO_PUBLIC_WS_BASE_URL = 'ws://ws.example.com';
      
      const result = enforceSecureConnection();
      
      expect(result).toBe(false);
    });
  });
});
