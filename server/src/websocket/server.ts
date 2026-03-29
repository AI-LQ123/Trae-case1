import { Server as HttpServer } from 'http';
import WebSocket, { WebSocket as WSWebSocket } from 'ws';
import { WebSocketMessage } from '../models/types';
import { ConnectionManager } from './connectionManager';
import { MessageRouter } from './messageRouter';
import { WebSocketServerConfig, ConnectionStatus } from './types';
import { AuthHandler } from './handlers/authHandler';
import { ChatMessageHandler } from './handlers/chatMessageHandler';
import { TaskHandler } from './handlers/taskHandler';
import { TerminalHandler } from './handlers/terminalHandler';
import { SyncHandler } from './handlers/syncHandler';
import { logger } from '../utils/logger';

export class WebSocketServer {
  private wss: WebSocket.Server;
  private connectionManager: ConnectionManager;
  private messageRouter: MessageRouter;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private config: WebSocketServerConfig;
  private rateLimiter = new Map<string, number[]>();

  constructor(server: HttpServer, config: WebSocketServerConfig = {}) {
    // Read configuration from environment variables
    const envConfig: WebSocketServerConfig = {
      port: process.env.WS_PORT ? parseInt(process.env.WS_PORT, 10) : undefined,
      heartbeatInterval: process.env.WS_HEARTBEAT_INTERVAL ? parseInt(process.env.WS_HEARTBEAT_INTERVAL, 10) : undefined,
      connectionTimeout: process.env.WS_CONNECTION_TIMEOUT ? parseInt(process.env.WS_CONNECTION_TIMEOUT, 10) : undefined,
      maxConnections: process.env.WS_MAX_CONNECTIONS ? parseInt(process.env.WS_MAX_CONNECTIONS, 10) : undefined,
      maxMessageSize: process.env.WS_MAX_MESSAGE_SIZE ? parseInt(process.env.WS_MAX_MESSAGE_SIZE, 10) : undefined,
    };

    this.config = this.validateConfig({
      port: 8080,
      heartbeatInterval: 30000,
      connectionTimeout: 60000,
      maxConnections: 100,
      maxMessageSize: 1024 * 1024, // 1MB default
      ...envConfig,
      ...config,
    });

    this.wss = new WebSocket.Server({ server });
    this.connectionManager = new ConnectionManager();
    this.messageRouter = new MessageRouter();

    // Register auth handler
    this.registerAuthHandler();
    // Register chat handler
    this.registerChatHandler();
    // Register task handler
    this.registerTaskHandler();
    // Register terminal handler
    this.registerTerminalHandler();
    // Register sync handler
    this.registerSyncHandler();

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

  private registerChatHandler(): void {
    const chatHandler = new ChatMessageHandler(this.connectionManager);
    this.messageRouter.registerHandler('chat:send', '', chatHandler);
    this.messageRouter.registerHandler('chat:history', '', chatHandler);
    this.messageRouter.registerHandler('chat:clear', '', chatHandler);
    logger.info('Chat handlers registered', {
      context: 'WebSocketServer',
    });
  }

  private registerTaskHandler(): void {
    const taskHandler = new TaskHandler(this.connectionManager);
    this.messageRouter.registerCommandHandler('task', taskHandler);
    logger.info('Task handler registered', {
      context: 'WebSocketServer',
    });
  }

  private registerTerminalHandler(): void {
    const terminalHandler = new TerminalHandler(this.connectionManager);
    this.messageRouter.registerCommandHandler('terminal', terminalHandler);
    logger.info('Terminal handler registered', {
      context: 'WebSocketServer',
    });
  }

  private registerSyncHandler(): void {
    const syncHandler = new SyncHandler(this.connectionManager);
    this.messageRouter.registerCommandHandler('sync', syncHandler);
    logger.info('Sync handler registered', {
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

      // 检查WebSocket连接的token验证
      const token = this.extractTokenFromRequest(req);
      if (!token) {
        logger.warn('WebSocket connection without token', {
          context: 'WebSocketServer',
          metadata: { clientIp },
        });
        ws.close(4001, 'Missing authentication token');
        return;
      }

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
      // Check rate limit
      if (!this.checkRateLimit(deviceId)) {
        logger.warn(`Rate limit exceeded for device: ${deviceId}`, {
          context: 'WebSocketServer',
          metadata: { deviceId },
        });
        this.sendErrorToDevice(deviceId, 'RATE_LIMIT_EXCEEDED', 'Rate limit exceeded, please slow down');
        return;
      }

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

      // 检查设备是否已认证（除了ping消息和认证相关消息外）
      const isAuthCommand = message.type === 'command' && message.payload && 'action' in message.payload && 
        (message.payload.action === 'generate_pairing_code' || message.payload.action === 'pair' || message.payload.action === 'authenticate');
      
      // 允许ping消息和认证相关消息，其他消息需要认证
      const isPingMessage = message.type === 'ping' as any;
      if (!isPingMessage && !isAuthCommand) {
        if (!connection.isAuthenticated) {
          logger.warn(`Unauthenticated device ${deviceId} trying to send message: ${message.type}`, {
            context: 'WebSocketServer',
            metadata: { deviceId, messageType: message.type },
          });
          this.sendErrorToDevice(deviceId, 'UNAUTHENTICATED', 'Device not authenticated');
          return;
        }
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

  private checkRateLimit(deviceId: string): boolean {
    const now = Date.now();
    const timestamps = this.rateLimiter.get(deviceId) || [];
    const recent = timestamps.filter(t => now - t < 60000); // 1分钟内
    if (recent.length > 60) { // 最多60条/分钟
      return false;
    }
    recent.push(now);
    this.rateLimiter.set(deviceId, recent);
    return true;
  }

  private extractTokenFromRequest(req: any): string | null {
    // 从sec-websocket-protocol头中提取token
    if (req.headers && req.headers['sec-websocket-protocol']) {
      const protocols = req.headers['sec-websocket-protocol'].split(',');
      for (const protocol of protocols) {
        const trimmed = protocol.trim();
        if (trimmed.startsWith('token-')) {
          return trimmed.substring(6); // 去掉 'token-' 前缀
        }
      }
    }
    
    // 从查询参数中提取token
    if (req.url && req.url.includes('token=')) {
      const urlParams = new URLSearchParams(req.url.substring(req.url.indexOf('?')));
      return urlParams.get('token');
    }
    
    return null;
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
