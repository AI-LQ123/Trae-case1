import { useEffect, useCallback, useState } from 'react';
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
}

export const useWebSocket = (options: WebSocketOptions | string = 'ws://localhost:3001'): UseWebSocketReturn => {
  const { connected, reconnecting } = useSelector((state: RootState) => state.websocket);
  
  // 处理options参数，支持字符串URL或完整选项对象
  const clientOptions = typeof options === 'string' ? { url: options } : options;
  
  const [client] = useState(() => new WebSocketClient(clientOptions));

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

  return {
    connected,
    reconnecting,
    send,
    ping,
    connect,
    disconnect,
  };
};
