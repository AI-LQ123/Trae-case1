import { Alert } from 'react-native';

export interface EnvConfig {
  API_BASE_URL: string;
  WS_BASE_URL: string;
}

const defaultConfig: EnvConfig = {
  API_BASE_URL: 'http://localhost:3000/api',
  WS_BASE_URL: 'ws://localhost:3001',
};

export const getEnvConfig = (): EnvConfig => {
  return {
    API_BASE_URL: process.env.EXPO_PUBLIC_API_BASE_URL || defaultConfig.API_BASE_URL,
    WS_BASE_URL: process.env.EXPO_PUBLIC_WS_BASE_URL || defaultConfig.WS_BASE_URL,
  };
};

export const validateEnvConfig = (): boolean => {
  const config = getEnvConfig();
  let isValid = true;

  if (!config.API_BASE_URL) {
    console.warn('API_BASE_URL is not configured');
    isValid = false;
  }

  if (!config.WS_BASE_URL) {
    console.warn('WS_BASE_URL is not configured');
    isValid = false;
  }

  return isValid;
};

export const showConfigAlert = () => {
  const config = getEnvConfig();
  Alert.alert(
    '环境配置',
    `当前配置:\nAPI_BASE_URL: ${config.API_BASE_URL}\nWS_BASE_URL: ${config.WS_BASE_URL}\n\n如需修改，请编辑 .env 文件`,
    [{ text: '确定' }]
  );
};
