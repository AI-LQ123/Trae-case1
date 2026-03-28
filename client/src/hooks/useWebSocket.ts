import { useEffect, useCallback, useState, useRef } from 'react';
import { useSelector } from 'react-redux';
import { WebSocketClient, WebSocketMessage, WebSocketOptions } from '../services/websocket/WebSocketClient';
import { RootState } from '../state/store';

interface UseWebSocketReturn {
  connected: boolean;
  reconnecting: boolean;
  send: (message: Omit<WebSocketMessage, 'deviceId'>) => void;
  ping: () => void;
  connect: () => void;
  disconnect: () => void;
  getClient: () => WebSocketClient;
}

// 存储全局客户端实例的引用
const clientRef = useRef<WebSocketClient | null>(null);

// 从环境变量获取WebSocket基础URL
const WS_BASE_URL = process.env.EXPO_PUBLIC_WS_BASE_URL || 'ws://localhost:3001';

export const useWebSocket = (options: WebSocketOptions | string = WS_BASE_URL): UseWebSocketReturn => {
  const { connected, reconnecting } = useSelector((state: RootState) => state.websocket);
  
  // 处理options参数，支持字符串URL或完整选项对象
  const clientOptions = typeof options === 'string' ? { url: options } : options;
  
  const [client] = useState(() => {
    if (!clientRef.current) {
      clientRef.current = new WebSocketClient(clientOptions);
    }
    return clientRef.current;
  });

  useEffect(() => {
    // 自动连接
    client.connect();

    // 清理函数
    return () => {
      // 组件卸载时断开连接，防止内存泄漏
      client.disconnect();
    };
  }, [client]);

  const send = useCallback((message: Omit<WebSocketMessage, 'deviceId'>) => {
    client.send(message);
  }, [client]);

  const ping = useCallback(() => {
    client.ping();
  }, [client]);

  const connect = useCallback(() => {
    client.connect();
  }, [client]);

  const disconnect = useCallback(() => {
    client.disconnect();
  }, [client]);

  const getClient = useCallback(() => {
    return client;
  }, [client]);

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
  return clientRef.current;
};
