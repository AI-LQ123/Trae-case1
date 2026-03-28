import { store } from '../../state/store';
import {
  setConnected,
  setReconnecting,
  setLastPingTime,
  setLatency,
  setError,
} from '../../state/slices/websocketSlice';
import { ReconnectionManager } from './reconnection';

export interface WebSocketMessage {
  type: 'command' | 'event' | 'ping' | 'pong';
  id: string;
  timestamp: number;
  deviceId: string;
  payload: Record<string, unknown>;
}

export class WebSocketClient {
  private ws: WebSocket | null = null;
  private url: string;
  private pingTimer: ReturnType<typeof setInterval> | null = null;
  private pongTimeout: ReturnType<typeof setTimeout> | null = null;
  private deviceId: string;
  private reconnectionManager: ReconnectionManager;
  private messageHandlers: Map<string, (msg: WebSocketMessage) => void> = new Map();

  constructor(url: string) {
    this.url = url;
    this.deviceId = this.generateDeviceId();
    this.reconnectionManager = new ReconnectionManager(
      () => this.connect(),
      () => store.dispatch(setReconnecting(true)),
      () => store.dispatch(setError('已达到最大重连次数'))
    );
  }

  public connect(): void {
    try {
      this.ws = new WebSocket(this.url);

      this.ws.onopen = () => {
        console.log('WebSocket connected');
        store.dispatch(setConnected(true));
        store.dispatch(setReconnecting(false));
        this.reconnectionManager.reset();
        this.startPing();
      };

      this.ws.onmessage = (event) => {
        this.handleMessage(event.data);
      };

      this.ws.onclose = () => {
        console.log('WebSocket closed');
        store.dispatch(setConnected(false));
        this.stopPing();
        this.scheduleReconnect();
      };

      this.ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        store.dispatch(setError('连接错误'));
      };
    } catch (error) {
      console.error('Failed to connect:', error);
      store.dispatch(setError('连接失败'));
      this.scheduleReconnect();
    }
  }

  private handleMessage(data: string): void {
    try {
      const message: WebSocketMessage = JSON.parse(data);

      if (message.type === 'pong') {
        // 收到pong，清除超时定时器
        if (this.pongTimeout) {
          clearTimeout(this.pongTimeout);
          this.pongTimeout = null;
        }
        const latency = Date.now() - message.timestamp;
        store.dispatch(setLastPingTime(Date.now()));
        store.dispatch(setLatency(latency));
        return;
      }

      // 分发消息到对应的处理器
      const handler = this.messageHandlers.get(message.type);
      if (handler) {
        handler(message);
      } else {
        console.log('Received message:', message);
      }
    } catch (error) {
      console.error('Failed to parse message:', error);
      store.dispatch(setError('消息解析错误'));
    }
  }

  public send(message: Omit<WebSocketMessage, 'deviceId'>): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      const fullMessage: WebSocketMessage = {
        ...message,
        deviceId: this.deviceId,
      };
      this.ws.send(JSON.stringify(fullMessage));
    } else {
      console.warn('WebSocket is not connected');
      store.dispatch(setError('连接未建立，无法发送消息'));
    }
  }

  public ping(): void {
    this.send({
      type: 'ping',
      id: this.generateMessageId(),
      timestamp: Date.now(),
      payload: {},
    });
    
    // 设置pong超时检测
    this.pongTimeout = setTimeout(() => {
      console.warn('Pong timeout, reconnecting...');
      this.ws?.close(); // 触发重连
    }, 5000); // 5秒超时
  }

  private startPing(): void {
    this.pingTimer = setInterval(() => {
      this.ping();
    }, 30000);
  }

  private stopPing(): void {
    if (this.pingTimer) {
      clearInterval(this.pingTimer);
      this.pingTimer = null;
    }
    if (this.pongTimeout) {
      clearTimeout(this.pongTimeout);
      this.pongTimeout = null;
    }
  }

  private scheduleReconnect(): void {
    this.reconnectionManager.scheduleReconnect();
  }

  public disconnect(): void {
    this.stopPing();
    this.reconnectionManager.cancel();
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  public onMessage(type: string, handler: (msg: WebSocketMessage) => void): void {
    this.messageHandlers.set(type, handler);
  }

  public offMessage(type: string): void {
    this.messageHandlers.delete(type);
  }

  private generateDeviceId(): string {
    return `mobile-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateMessageId(): string {
    return `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}

export const wsClient = new WebSocketClient('ws://localhost:3001');
