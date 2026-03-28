import { Server as HttpServer } from 'http';
import WebSocket, { WebSocket as WSWebSocket } from 'ws';
import { WebSocketMessage } from '../models/types';
import { ConnectionManager } from './connectionManager';
import { MessageRouter } from './messageRouter';
import { WebSocketServerConfig, ConnectionStatus } from './types';
import { AuthHandler } from './handlers/authHandler';
import { logger } from '../utils/logger';

export class WebSocketServer {
  private wss: WebSocket.Server;
  private connectionManager: ConnectionManager;
  private messageRouter: MessageRouter;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private config: WebSocketServerConfig;

  constructor(server: HttpServer, config: WebSocketServerConfig = {}) {
    this.config = this.validateConfig({
      port: 8080,
      heartbeatInterval: 30000,
      connectionTimeout: 60000,
      maxConnections: 100,
      maxMessageSize: 1024 * 1024, // 1MB default
      ...config,
    });

    this.wss = new WebSocket.Server({ server });
    this.connectionManager = new ConnectionManager();
    this.messageRouter = new MessageRouter();

    // Register auth handler
    this.registerAuthHandler();

    this.setupWebSocketServer();
    this.startHeartbeat();
  }

  private registerAuthHandler(): void {
    const authHandler = new AuthHandler(this);
    this.messageRouter.registerCommandHandler('auth', authHandler);
    logger.info('Auth handler registered', {
      context: 'WebSocketServer',
    });
  }

  private validateConfig(config: WebSocketServerConfig): WebSocketServerConfig {
    if (config.maxConnections !== undefined && config.maxConnections <= 0) {
      throw new Error('maxConnections must be greater than 0');
    }
    if (config.heartbeatInterval !== undefined && config.heartbeatInterval < 1000) {
      throw new Error('heartbeatInterval must be at least 1000ms');
    }
    if (config.connectionTimeout !== undefined && config.connectionTimeout < 5000) {
      throw new Error('connectionTimeout must be at least 5000ms');
    }
    if (config.maxMessageSize !== undefined && config.maxMessageSize <= 0) {
      throw new Error('maxMessageSize must be greater than 0');
    }
    return config as WebSocketServerConfig;
  }

  private setupWebSocketServer(): void {
    this.wss.on('connection', (ws: WSWebSocket, req) => {
      const clientIp = req.socket.remoteAddress;
      logger.info(`New WebSocket connection from ${clientIp}`, {
        context: 'WebSocketServer',
        metadata: { clientIp },
      });

      if (this.connectionManager.size() >= this.config.maxConnections!) {
        logger.warn('Max connections reached, closing new connection', {
          context: 'WebSocketServer',
        });
        ws.close(4000, 'Max connections reached');
        return;
      }

      const deviceId = this.generateDeviceId();
      const connection = this.connectionManager.addConnection(deviceId, ws, clientIp);

      ws.on('message', (data: WebSocket.RawData) => {
        this.handleMessage(deviceId, data);
      });

      ws.on('close', (code, reason) => {
        logger.info(`Connection closed: ${deviceId}, code: ${code}, reason: ${reason}`, {
          context: 'WebSocketServer',
          metadata: { deviceId, code, reason },
        });
        this.connectionManager.removeConnection(deviceId);
      });

      ws.on('error', (error: Error) => {
        logger.error(`WebSocket error for ${deviceId}: ${error.message}`, {
          context: 'WebSocketServer',
          metadata: { deviceId, error: error.message },
        });
        this.sendErrorToDevice(deviceId, 'WEBSOCKET_ERROR', 'WebSocket connection error');
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
      // Check message size
      const messageSize = Buffer.byteLength(data as Buffer);
      if (messageSize > this.config.maxMessageSize!) {
        logger.warn(`Message size exceeds limit: ${messageSize} bytes`, {
          context: 'WebSocketServer',
          metadata: { deviceId, messageSize, limit: this.config.maxMessageSize },
        });
        this.sendErrorToDevice(deviceId, 'MESSAGE_TOO_LARGE', `Message size exceeds limit of ${this.config.maxMessageSize} bytes`);
        return;
      }

      const message: WebSocketMessage = JSON.parse(data.toString());
      const connection = this.connectionManager.getConnection(deviceId);

      if (!connection) {
        logger.warn(`Message from unknown device: ${deviceId}`, {
          context: 'WebSocketServer',
        });
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
        logger.info(`Unhandled message ${message.type} from ${deviceId}`, {
          context: 'WebSocketServer',
          metadata: { deviceId, messageType: message.type, payload: message.payload },
        });
        this.sendErrorToDevice(deviceId, 'UNHANDLED_MESSAGE', `Message type '${message.type}' is not handled`);
      }
    } catch (error) {
      logger.error(`Failed to parse message from ${deviceId}: ${(error as Error).message}`, {
        context: 'WebSocketServer',
        metadata: { deviceId, error: (error as Error).message },
      });
      this.sendErrorToDevice(deviceId, 'INVALID_MESSAGE', 'Failed to parse message');
    }
  }

  public sendErrorToDevice(deviceId: string, code: string, message: string): boolean {
    return this.sendToDevice(deviceId, {
      type: 'event',
      id: this.generateMessageId(),
      timestamp: Date.now(),
      deviceId: 'server',
      payload: {
        category: 'error',
        data: {
          code,
          message,
        },
      },
    });
  }

  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      const disconnectedDevices = this.connectionManager.checkConnections(this.config.connectionTimeout!);
      
      for (const deviceId of disconnectedDevices) {
        const connection = this.connectionManager.getConnection(deviceId);
        if (connection) {
          logger.info(`Connection timeout: ${deviceId}`, {
            context: 'WebSocketServer',
            metadata: { deviceId },
          });
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
      clientIp: conn.clientIp,
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
    // Stop heartbeat
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }

    // Close all connections gracefully
    for (const connection of this.connectionManager.getAllConnections()) {
      if (connection.ws.readyState === WebSocket.OPEN) {
        connection.ws.close(1000, 'Server shutting down');
      }
    }
    this.connectionManager.clear();

    // Clear message handlers
    this.messageRouter.clearHandlers();

    // Close WebSocket server
    this.wss.close();
  }
}
