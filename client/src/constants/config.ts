import { Alert } from 'react-native';

export interface EnvConfig {
  API_BASE_URL: string;
  WS_BASE_URL: string;
  isSecure: boolean;
}

const defaultConfig: EnvConfig = {
  API_BASE_URL: 'http://localhost:3000/api',
  WS_BASE_URL: 'ws://localhost:3001',
  isSecure: false,
};

// URL格式校验正则表达式
const API_URL_REGEX = /^https?:\/\/.+/;
const WS_URL_REGEX = /^wss?:\/\/.+/;

export const getEnvConfig = (): EnvConfig => {
  const apiUrl = process.env.EXPO_PUBLIC_API_BASE_URL || defaultConfig.API_BASE_URL;
  const wsUrl = process.env.EXPO_PUBLIC_WS_BASE_URL || defaultConfig.WS_BASE_URL;
  
  // 检查是否为安全连接（生产环境应该使用https和wss）
  const isSecure = apiUrl.startsWith('https://') && wsUrl.startsWith('wss://');
  
  return {
    API_BASE_URL: apiUrl,
    WS_BASE_URL: wsUrl,
    isSecure,
  };
};

export const validateEnvConfig = (): { isValid: boolean; errors: string[]; warnings: string[] } => {
  const config = getEnvConfig();
  const errors: string[] = [];
  const warnings: string[] = [];

  // 检查API_BASE_URL
  if (!config.API_BASE_URL) {
    errors.push('API_BASE_URL 未配置');
  } else if (!API_URL_REGEX.test(config.API_BASE_URL)) {
    errors.push('API_BASE_URL 格式错误，必须以 http:// 或 https:// 开头');
  }

  // 检查WS_BASE_URL
  if (!config.WS_BASE_URL) {
    errors.push('WS_BASE_URL 未配置');
  } else if (!WS_URL_REGEX.test(config.WS_BASE_URL)) {
    errors.push('WS_BASE_URL 格式错误，必须以 ws:// 或 wss:// 开头');
  }

  // 生产环境安全检查
  if (!__DEV__) {
    if (!config.isSecure) {
      errors.push('生产环境必须使用 https:// 和 wss:// 协议');
    }
  } else {
    // 开发环境警告
    if (!config.isSecure) {
      warnings.push('开发环境使用非安全连接 (http/ws)，生产环境请切换到 https/wss');
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
};

export const showConfigAlert = () => {
  const config = getEnvConfig();
  const { isValid, errors, warnings } = validateEnvConfig();
  
  let message = `当前配置:\nAPI_BASE_URL: ${config.API_BASE_URL}\nWS_BASE_URL: ${config.WS_BASE_URL}\n`;
  
  if (!isValid) {
    message += `\n❌ 错误:\n${errors.join('\n')}`;
  }
  
  if (warnings.length > 0) {
    message += `\n⚠️ 警告:\n${warnings.join('\n')}`;
  }
  
  message += '\n\n如需修改，请编辑 .env 文件';
  
  Alert.alert(
    isValid ? '环境配置' : '配置错误',
    message,
    [{ text: '确定' }]
  );
};

// 强制使用安全连接（生产环境）
export const enforceSecureConnection = (): boolean => {
  if (!__DEV__) {
    const config = getEnvConfig();
    if (!config.isSecure) {
      console.error('生产环境必须使用安全连接 (https/wss)');
      return false;
    }
  }
  return true;
};
