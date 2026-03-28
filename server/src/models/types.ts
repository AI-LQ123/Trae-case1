import WebSocket from 'ws';

export interface WebSocketMessage {
  type: 'command' | 'event' | 'ping' | 'pong';
  id: string;
  timestamp: number;
  deviceId: string;
  payload: MessagePayload;
}

export type MessagePayload =
  | CommandPayload
  | EventPayload
  | PingPayload
  | PongPayload;

export interface CommandPayload {
  category: 'ai_chat' | 'terminal' | 'task' | 'file';
  action: string;
  data: Record<string, unknown>;
}

export interface EventPayload {
  category: string;
  data: Record<string, unknown>;
}

export interface PingPayload {
  timestamp: number;
}

export interface PongPayload {
  timestamp: number;
  serverTime: number;
}

export interface DeviceInfo {
  deviceId: string;
  name: string;
  platform: 'ios' | 'android';
  version: string;
  lastConnected: number;
}

export interface Connection {
  deviceId: string;
  ws: WebSocket;
  connectedAt: number;
  lastPing: number;
  isAuthenticated: boolean;
  clientIp?: string;
}
