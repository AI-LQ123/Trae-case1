import { Server as HttpServer } from 'http';
import WebSocket, { WebSocket as WSWebSocket } from 'ws';
import { WebSocketMessage, Connection } from '../models/types';

export class WebSocketServer {
  private wss: WebSocket.Server;
  private connections: Map<string, Connection> = new Map();
  private heartbeatInterval: NodeJS.Timeout | null = null;

  constructor(server: HttpServer) {
    this.wss = new WebSocket.Server({ server });
    this.setupWebSocketServer();
    this.startHeartbeat();
  }

  private setupWebSocketServer(): void {
    this.wss.on('connection', (ws: WSWebSocket, req) => {
      console.log(`New WebSocket connection from ${req.socket.remoteAddress}`);

      const deviceId = this.generateDeviceId();
      const connection: Connection = {
        deviceId,
        ws,
        connectedAt: Date.now(),
        lastPing: Date.now(),
        isAuthenticated: false,
      };

      this.connections.set(deviceId, connection);

      ws.on('message', (data: WebSocket.RawData) => {
        this.handleMessage(deviceId, data);
      });

      ws.on('close', () => {
        console.log(`Connection closed: ${deviceId}`);
        this.connections.delete(deviceId);
      });

      ws.on('error', (error: Error) => {
        console.error(`WebSocket error for ${deviceId}:`, error);
        this.connections.delete(deviceId);
      });

      this.sendToDevice(deviceId, {
        type: 'event',
        id: this.generateMessageId(),
        timestamp: Date.now(),
        deviceId: 'server',
        payload: {
          category: 'connection',
          data: {
            event: 'connected',
            deviceId,
          },
        },
      });
    });
  }

  private handleMessage(deviceId: string, data: WebSocket.RawData): void {
    try {
      const message: WebSocketMessage = JSON.parse(data.toString());
      const connection = this.connections.get(deviceId);

      if (!connection) {
        console.warn(`Message from unknown device: ${deviceId}`);
        return;
      }

      if (message.type === 'ping') {
        connection.lastPing = Date.now();
        this.sendToDevice(deviceId, {
          type: 'pong',
          id: this.generateMessageId(),
          timestamp: Date.now(),
          deviceId: 'server',
          payload: {
            timestamp: message.timestamp,
            serverTime: Date.now(),
          },
        });
        return;
      }

      console.log(`Received ${message.type} from ${deviceId}:`, message.payload);
    } catch (error) {
      console.error(`Failed to parse message from ${deviceId}:`, error);
    }
  }

  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      const now = Date.now();
      const timeout = 60000;

      for (const [deviceId, connection] of this.connections.entries()) {
        if (now - connection.lastPing > timeout) {
          console.log(`Connection timeout: ${deviceId}`);
          connection.ws.close();
          this.connections.delete(deviceId);
        }
      }
    }, 30000);
  }

  public sendToDevice(deviceId: string, message: WebSocketMessage): boolean {
    const connection = this.connections.get(deviceId);
    if (connection && connection.ws.readyState === WebSocket.OPEN) {
      connection.ws.send(JSON.stringify(message));
      return true;
    }
    return false;
  }

  public broadcast(message: WebSocketMessage, excludeDeviceId?: string): void {
    for (const [deviceId, connection] of this.connections.entries()) {
      if (deviceId !== excludeDeviceId && connection.ws.readyState === WebSocket.OPEN) {
        connection.ws.send(JSON.stringify(message));
      }
    }
  }

  public getConnections(): Connection[] {
    return Array.from(this.connections.values());
  }

  private generateDeviceId(): string {
    return `device-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateMessageId(): string {
    return `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  public close(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }
    this.wss.close();
  }
}
