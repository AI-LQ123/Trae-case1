import { Server as HttpServer } from 'http';
import WebSocket, { WebSocket as WSWebSocket } from 'ws';
import { WebSocketMessage } from '../models/types';
import { ConnectionManager } from './connectionManager';
import { MessageRouter } from './messageRouter';
import { WebSocketServerConfig, ConnectionStatus } from './types';

export class WebSocketServer {
  private wss: WebSocket.Server;
  private connectionManager: ConnectionManager;
  private messageRouter: MessageRouter;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private config: WebSocketServerConfig;

  constructor(server: HttpServer, config: WebSocketServerConfig = {}) {
    this.config = {
      port: 8080,
      heartbeatInterval: 30000,
      connectionTimeout: 60000,
      maxConnections: 100,
      ...config,
    };

    this.wss = new WebSocket.Server({ server });
    this.connectionManager = new ConnectionManager();
    this.messageRouter = new MessageRouter();

    this.setupWebSocketServer();
    this.startHeartbeat();
  }

  private setupWebSocketServer(): void {
    this.wss.on('connection', (ws: WSWebSocket, req) => {
      const clientIp = req.socket.remoteAddress;
      console.log(`New WebSocket connection from ${clientIp}`);

      if (this.connectionManager.size() >= this.config.maxConnections!) {
        console.warn('Max connections reached, closing new connection');
        ws.close(4000, 'Max connections reached');
        return;
      }

      const deviceId = this.generateDeviceId();
      const connection = this.connectionManager.addConnection(deviceId, ws);

      ws.on('message', (data: WebSocket.RawData) => {
        this.handleMessage(deviceId, data);
      });

      ws.on('close', (code, reason) => {
        console.log(`Connection closed: ${deviceId}, code: ${code}, reason: ${reason}`);
        this.connectionManager.removeConnection(deviceId);
      });

      ws.on('error', (error: Error) => {
        console.error(`WebSocket error for ${deviceId}:`, error);
        this.connectionManager.removeConnection(deviceId);
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

  private async handleMessage(deviceId: string, data: WebSocket.RawData): Promise<void> {
    try {
      const message: WebSocketMessage = JSON.parse(data.toString());
      const connection = this.connectionManager.getConnection(deviceId);

      if (!connection) {
        console.warn(`Message from unknown device: ${deviceId}`);
        return;
      }

      if (message.type === 'ping') {
        this.connectionManager.updateLastPing(deviceId);
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

      const routed = await this.messageRouter.route(message, deviceId);
      if (!routed) {
        console.log(`Unhandled message ${message.type} from ${deviceId}:`, message.payload);
      }
    } catch (error) {
      console.error(`Failed to parse message from ${deviceId}:`, error);
    }
  }

  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      const disconnectedDevices = this.connectionManager.checkConnections(this.config.connectionTimeout!);
      
      for (const deviceId of disconnectedDevices) {
        const connection = this.connectionManager.getConnection(deviceId);
        if (connection) {
          console.log(`Connection timeout: ${deviceId}`);
          connection.ws.close(4001, 'Connection timeout');
          this.connectionManager.removeConnection(deviceId);
        }
      }
    }, this.config.heartbeatInterval!);
  }

  public sendToDevice(deviceId: string, message: WebSocketMessage): boolean {
    const connection = this.connectionManager.getConnection(deviceId);
    if (connection && connection.ws.readyState === WebSocket.OPEN) {
      connection.ws.send(JSON.stringify(message));
      return true;
    }
    return false;
  }

  public broadcast(message: WebSocketMessage, excludeDeviceId?: string): void {
    for (const connection of this.connectionManager.getAllConnections()) {
      if (connection.deviceId !== excludeDeviceId && connection.ws.readyState === WebSocket.OPEN) {
        connection.ws.send(JSON.stringify(message));
      }
    }
  }

  public getConnections(): ConnectionStatus[] {
    return this.connectionManager.getAllConnections().map(conn => ({
      deviceId: conn.deviceId,
      isConnected: conn.ws.readyState === WebSocket.OPEN,
      isAuthenticated: conn.isAuthenticated,
      connectedAt: conn.connectedAt,
      lastPing: conn.lastPing,
    }));
  }

  public getMessageRouter(): MessageRouter {
    return this.messageRouter;
  }

  public getConnectionManager(): ConnectionManager {
    return this.connectionManager;
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
    this.connectionManager.clear();
    this.messageRouter.clearHandlers();
  }
}
