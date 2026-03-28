import WebSocket from 'ws';

export interface WebSocketMessage {
  type: 'command' | 'event' | 'ping' | 'pong' | 'chat:send' | 'chat:message' | 'chat:history' | 'chat:clear' | 'chat:cleared' | 'error';
  id: string;
  timestamp: number;
  deviceId: string;
  payload: MessagePayload | ChatMessage | ChatMessage[] | null;
}

export type MessagePayload =
  | CommandPayload
  | EventPayload
  | AuthPayload
  | PingPayload
  | PongPayload
  | ErrorPayload;

export interface CommandPayload {
  category: 'ai_chat' | 'terminal' | 'task' | 'file';
  action: string;
  data: Record<string, unknown>;
}

export interface EventPayload {
  category: string;
  data: Record<string, unknown>;
}

export interface AuthPayload {
  action: 'generate_pairing_code' | 'pair' | 'authenticate';
  data: Record<string, unknown>;
}

export interface PingPayload {
  timestamp: number;
}

export interface PongPayload {
  timestamp: number;
  serverTime: number;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

export interface ErrorPayload {
  message: string;
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

export interface FileInfo {
  name: string;
  path: string;
  size: number;
  mtime: number;
  isFile: true;
  isDirectory: false;
}

export interface DirectoryInfo {
  name: string;
  path: string;
  isFile: false;
  isDirectory: true;
  children?: FileSystemItem[];
}

export type FileSystemItem = FileInfo | DirectoryInfo;

export interface ProjectInfo {
  name: string;
  path: string;
  type: string;
  files: number;
  directories: number;
}
