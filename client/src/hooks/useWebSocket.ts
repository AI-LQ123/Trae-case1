import { useEffect, useCallback, useRef } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { WebSocketClient, WebSocketMessage, WebSocketOptions } from '../services/websocket/WebSocketClient';
import { RootState, AppDispatch } from '../state/store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getEnvConfig } from '../constants/config';
import { setConnected, setReconnecting } from '../state/slices/websocketSlice';

interface UseWebSocketReturn {
  connected: boolean;
  reconnecting: boolean;
  send: (message: Omit<WebSocketMessage, 'deviceId'>) => void;
  ping: () => void;
  connect: () => void;
  disconnect: () => void;
  getClient: () => WebSocketClient | null;
  reconnect: () => void;
}

// 存储全局客户端实例的引用（不使用useRef，因为useRef不能在组件外部使用）
let globalClient: WebSocketClient | null = null;
let currentUrl: string | null = null;

// 从配置获取WebSocket基础URL
const { WS_BASE_URL } = getEnvConfig();

export const useWebSocket = (options: WebSocketOptions | string = WS_BASE_URL): UseWebSocketReturn => {
  const { connected, reconnecting } = useSelector((state: RootState) => state.websocket);
  const dispatch = useDispatch<AppDispatch>();
  const clientRef = useRef<WebSocketClient | null>(null);
  const isMountedRef = useRef(true);
  const initPromiseRef = useRef<Promise<void> | null>(null);
  
  // 处理options参数，支持字符串URL或完整选项对象
  const clientOptions = typeof options === 'string' ? { url: options } : options;
  const url = clientOptions.url || WS_BASE_URL;
  
  // 在组件内初始化客户端实例
  useEffect(() => {
    isMountedRef.current = true;
    
    const initClient = async () => {
      // 如果URL变化，需要重新创建客户端
      if (currentUrl && currentUrl !== url && globalClient) {
        console.log('WebSocket URL changed, disconnecting old client...');
        globalClient.disconnect();
        globalClient = null;
        currentUrl = null;
      }
      
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
          onAuthError: handleAuthError,
        };
        
        if (!globalClient) {
          globalClient = new WebSocketClient(finalOptions);
          currentUrl = url;
        }
        clientRef.current = globalClient;
        
        // 设置连接状态监听
        setupConnectionListeners();
      }
    };
    
    // 防止竞态条件
    if (!initPromiseRef.current) {
      initPromiseRef.current = initClient();
    }
    
    return () => {
      isMountedRef.current = false;
      // 注意：我们不在这里断开连接，因为可能有其他组件仍在使用
      // 只有最后一个组件卸载时才应该断开
    };
  }, [clientOptions, url]);
  
  // 设置连接状态监听
  const setupConnectionListeners = useCallback(() => {
    if (!clientRef.current) return;
    
    // 监听连接状态变化
    const client = clientRef.current;
    
    // 这里假设WebSocketClient有相应的事件监听方法
    // 实际实现可能需要根据WebSocketClient的具体API调整
  }, []);
  
  // 处理认证错误
  const handleAuthError = useCallback(async () => {
    console.error('WebSocket authentication error, attempting to refresh token...');
    
    // 尝试刷新token或重新登录
    try {
      // 清除旧的token
      await AsyncStorage.removeItem('auth_token');
      
      // 触发重新登录流程（可以通过Redux action或事件总线）
      dispatch(setConnected(false));
      
      // 这里可以触发一个全局事件，让登录组件显示
      // EventEmitter.emit('auth:required');
      
      console.log('Token cleared, please login again');
    } catch (error) {
      console.error('Error handling auth error:', error);
    }
  }, [dispatch]);

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
  
  const reconnect = useCallback(() => {
    if (clientRef.current) {
      clientRef.current.disconnect();
      setTimeout(() => {
        if (isMountedRef.current) {
          clientRef.current?.connect();
        }
      }, 1000);
    }
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
    reconnect,
  };
};

// 静态方法，用于在其他地方获取客户端实例
useWebSocket.getClient = () => {
  return globalClient;
};

// 全局断开连接方法（用于应用退出时清理）
useWebSocket.disconnectAll = () => {
  if (globalClient) {
    globalClient.disconnect();
    globalClient = null;
    currentUrl = null;
  }
};
