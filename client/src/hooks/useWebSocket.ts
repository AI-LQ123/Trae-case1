import { useEffect, useCallback, useRef } from 'react';
import { useSelector } from 'react-redux';
import { WebSocketClient, WebSocketMessage, WebSocketOptions } from '../services/websocket/WebSocketClient';
import { RootState } from '../state/store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getEnvConfig } from '../constants/config';

interface UseWebSocketReturn {
  connected: boolean;
  reconnecting: boolean;
  send: (message: Omit<WebSocketMessage, 'deviceId'>) => void;
  ping: () => void;
  connect: () => void;
  disconnect: () => void;
  getClient: () => WebSocketClient | null;
}

// 存储全局客户端实例的引用（不使用useRef，因为useRef不能在组件外部使用）
let globalClient: WebSocketClient | null = null;

// 从配置获取WebSocket基础URL
const { WS_BASE_URL } = getEnvConfig();

export const useWebSocket = (options: WebSocketOptions | string = WS_BASE_URL): UseWebSocketReturn => {
  const { connected, reconnecting } = useSelector((state: RootState) => state.websocket);
  const clientRef = useRef<WebSocketClient | null>(null);
  
  // 处理options参数，支持字符串URL或完整选项对象
  const clientOptions = typeof options === 'string' ? { url: options } : options;
  
  // 在组件内初始化客户端实例
  useEffect(() => {
    const initClient = async () => {
      if (!clientRef.current) {
        // 获取认证token
        let authToken = clientOptions.authToken;
        if (!authToken) {
          try {
            authToken = await AsyncStorage.getItem('auth_token') || undefined;
          } catch (error) {
            console.error('Error getting auth token:', error);
          }
        }
        
        // 创建客户端实例，合并选项
        const finalOptions = {
          ...clientOptions,
          authToken: authToken || clientOptions.authToken,
        };
        
        if (!globalClient) {
          globalClient = new WebSocketClient(finalOptions);
        }
        clientRef.current = globalClient;
      }
    };
    
    initClient();
  }, [clientOptions]);

  const send = useCallback((message: Omit<WebSocketMessage, 'deviceId'>) => {
    clientRef.current?.send(message);
  }, []);

  const ping = useCallback(() => {
    clientRef.current?.ping();
  }, []);

  const connect = useCallback(() => {
    clientRef.current?.connect();
  }, []);

  const disconnect = useCallback(() => {
    clientRef.current?.disconnect();
  }, []);

  const getClient = useCallback(() => {
    return clientRef.current;
  }, []);

  return {
    connected,
    reconnecting,
    send,
    ping,
    connect,
    disconnect,
    getClient,
  };
};

// 静态方法，用于在其他地方获取客户端实例
useWebSocket.getClient = () => {
  return globalClient;
};
