import WebSocket from 'ws';

// 定义ChatPayload类型
export interface ChatPayload {
  sessionId?: string;
  message?: ChatMessage;
}

export interface WebSocketMessage {
  type: 'command' | 'event' | 'ping' | 'pong' | 'chat:send' | 'chat:message' | 'chat:history' | 'chat:clear' | 'chat:cleared' | 'error';
  id: string;
  timestamp: number;
  deviceId: string;
  payload: MessagePayload | ChatMessage | ChatMessage[] | ChatPayload | null;
}

export type MessagePayload =
  | CommandPayload
  | EventPayload
  | AuthPayload
  | PingPayload
  | PongPayload
  | ErrorPayload;

export interface CommandPayload {
  category: 'ai_chat' | 'terminal' | 'task' | 'file' | 'sync';
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

export interface TaskStep {
  id: string;
  name: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  progress: number;
  startTime?: number;
  endTime?: number;
  output?: string;
  error?: string;
}

export interface Task {
  id: string;
  name: string;
  command: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  progress: number;
  priority?: 'low' | 'medium' | 'high';
  createdAt: number;
  startedAt?: number;
  completedAt?: number;
  updatedAt: number; // 任务更新时间，用于同步检测
  output?: string;
  error?: string;
  cwd?: string;
  env?: Record<string, string>;
  timeout?: number;
  metadata?: {
    estimatedTime?: number;
    remainingTime?: number;
    steps?: TaskStep[];
  };
}

export interface TaskCreateRequest {
  name: string;
  command: string;
  cwd?: string;
  env?: Record<string, string>;
  timeout?: number;
}

export interface TaskOperationRequest {
  taskId: string;
  operation: 'pause' | 'resume' | 'cancel';
}
