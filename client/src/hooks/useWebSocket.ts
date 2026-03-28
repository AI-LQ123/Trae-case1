import { useEffect, useCallback, useState } from 'react';
import { useSelector } from 'react-redux';
import { wsClient, WebSocketMessage } from '../services/websocket/WebSocketClient';
import { RootState } from '../state/store';

interface UseWebSocketReturn {
  connected: boolean;
  reconnecting: boolean;
  send: (message: Omit<WebSocketMessage, 'deviceId'>) => void;
  ping: () => void;
  connect: () => void;
  disconnect: () => void;
}

export const useWebSocket = (): UseWebSocketReturn => {
  const { connected, reconnecting } = useSelector((state: RootState) => state.websocket);
  const [client] = useState(() => wsClient);

  useEffect(() => {
    // 自动连接
    client.connect();

    // 清理函数
    return () => {
      // 组件卸载时不自动断开，保持连接
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
