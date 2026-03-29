import { WebSocketMessage, Connection } from '../models/types';

// WebSocket 服务器配置接口
export interface WebSocketServerConfig {
  port?: number;
  heartbeatInterval?: number;
  connectionTimeout?: number;
  maxConnections?: number;
  maxMessageSize?: number; // 最大消息大小（字节），默认1MB
  requireAuth?: boolean; // 是否要求连接时认证，默认为true
}

// 消息处理结果接口
export interface MessageHandleResult {
  success: boolean;
  error?: string;
  data?: Record<string, unknown>;
}

// 连接状态接口
export interface ConnectionStatus {
  deviceId: string;
  isConnected: boolean;
  isAuthenticated: boolean;
  connectedAt: number;
  lastPing: number;
  clientIp?: string;
}

// 心跳消息接口
export interface HeartbeatMessage extends WebSocketMessage {
  type: 'ping' | 'pong';
  payload: {
    timestamp: number;
    serverTime?: number;
  };
}

// 连接事件消息接口
export interface ConnectionEventMessage extends WebSocketMessage {
  type: 'event';
  payload: {
    category: 'connection';
    data: {
      event: 'connected' | 'disconnected' | 'authenticated';
      deviceId: string;
      reason?: string;
    };
  };
}

// 错误消息接口
export interface ErrorMessage extends WebSocketMessage {
  type: 'event';
  payload: {
    category: 'error';
    data: {
      code: string;
      message: string;
      details?: Record<string, unknown>;
    };
  };
}

// 认证消息接口
export interface AuthMessage extends WebSocketMessage {
  type: 'command' | 'event';
  payload: {
    category: 'auth';
    action?: 'pair' | 'verify';
    data: {
      pairingCode?: string;
      token?: string;
      success?: boolean;
      error?: string;
    };
  };
}
