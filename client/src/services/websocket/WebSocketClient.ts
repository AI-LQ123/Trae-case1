import { store } from '../../state/store';
import {
  setConnected,
  setReconnecting,
  incrementReconnectAttempt,
  setLastPingTime,
  setLatency,
  setError,
} from '../../state/slices/websocketSlice';

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
  private reconnectTimer: NodeJS.Timeout | null = null;
  private pingTimer: NodeJS.Timeout | null = null;
  private reconnectAttempt = 0;
  private maxReconnectAttempts = 10;
  private baseDelay = 1000;
  private maxDelay = 30000;
  private deviceId: string;

  constructor(url: string) {
    this.url = url;
    this.deviceId = this.generateDeviceId();
  }

  public connect(): void {
    try {
      this.ws = new WebSocket(this.url);

      this.ws.onopen = () => {
        console.log('WebSocket connected');
        store.dispatch(setConnected(true));
        store.dispatch(setReconnecting(false));
        this.reconnectAttempt = 0;
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
        const latency = Date.now() - message.timestamp;
        store.dispatch(setLastPingTime(Date.now()));
        store.dispatch(setLatency(latency));
        return;
      }

      console.log('Received message:', message);
    } catch (error) {
      console.error('Failed to parse message:', error);
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
    }
  }

  public ping(): void {
    this.send({
      type: 'ping',
      id: this.generateMessageId(),
      timestamp: Date.now(),
      payload: {},
    });
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
  }

  private scheduleReconnect(): void {
    if (this.reconnectAttempt >= this.maxReconnectAttempts) {
      store.dispatch(setError('已达到最大重连次数'));
      return;
    }

    store.dispatch(setReconnecting(true));
    store.dispatch(incrementReconnectAttempt());
    this.reconnectAttempt++;

    const delay = Math.min(
      this.baseDelay * Math.pow(2, this.reconnectAttempt),
      this.maxDelay
    );

    console.log(`Reconnecting in ${delay}ms (attempt ${this.reconnectAttempt})`);

    this.reconnectTimer = setTimeout(() => {
      this.connect();
    }, delay);
  }

  public disconnect(): void {
    this.stopPing();
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  private generateDeviceId(): string {
    return `mobile-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateMessageId(): string {
    return `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}

export const wsClient = new WebSocketClient('ws://localhost:3001');
