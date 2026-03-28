import { WebSocketMessage, CommandPayload, EventPayload } from '../../models/types';
import { terminalManager, TerminalOutput } from '../../services/terminalManager';
import { ConnectionManager } from '../connectionManager';
import { logger } from '../../utils/logger';
import { MessageHandler } from '../messageRouter';

export class TerminalHandler implements MessageHandler {
  private connectionManager: ConnectionManager;
  private outputSubscriptions: Map<string, Set<string>> = new Map();
  private deviceCallbacks: Map<string, Map<string, (output: TerminalOutput) => void>> = new Map();

  constructor(connectionManager: ConnectionManager) {
    this.connectionManager = connectionManager;
  }

  async handle(message: WebSocketMessage, deviceId: string): Promise<void> {
    if (message.type !== 'command') {
      return;
    }

    const payload = message.payload as CommandPayload;
    if (payload.category !== 'terminal') {
      return;
    }

    const { action, data } = payload;

    switch (action) {
      case 'create_session':
        await this.handleCreateSession(message, deviceId, data);
        break;
      case 'execute_command':
        await this.handleExecuteCommand(message, deviceId, data);
        break;
      case 'resize':
        await this.handleResize(message, deviceId, data);
        break;
      case 'close_session':
        await this.handleCloseSession(message, deviceId, data);
        break;
      case 'list_sessions':
        await this.handleListSessions(message, deviceId);
        break;
      case 'subscribe_output':
        await this.handleSubscribeOutput(message, deviceId, data);
        break;
      case 'unsubscribe_output':
        await this.handleUnsubscribeOutput(message, deviceId, data);
        break;
      default:
        logger.warn(`Unknown terminal action: ${action}`, {
          context: 'TerminalHandler',
          metadata: { action, deviceId },
        });
        this.sendError(deviceId, message.id, `Unknown terminal action: ${action}`);
    }
  }

  private async handleCreateSession(
    message: WebSocketMessage,
    deviceId: string,
    data: Record<string, unknown>
  ): Promise<void> {
    try {
      const name = (data.name as string) || 'Terminal';
      const cwd = data.cwd as string | undefined;

      const session = terminalManager.createSession(name, cwd);

      this.sendResponse(deviceId, message.id, {
        category: 'terminal',
        action: 'session_created',
        data: {
          sessionId: session.id,
          name: session.name,
          cwd: session.cwd,
          createdAt: session.createdAt,
          status: session.status,
        },
      });

      logger.info(`Terminal session created for device: ${deviceId}`, {
        context: 'TerminalHandler',
        metadata: { deviceId, sessionId: session.id },
      });
    } catch (error) {
      logger.error(`Failed to create terminal session: ${(error as Error).message}`, {
        context: 'TerminalHandler',
        metadata: { deviceId, error: (error as Error).message },
      });
      this.sendError(deviceId, message.id, 'Failed to create terminal session');
    }
  }

  private async handleExecuteCommand(
    message: WebSocketMessage,
    deviceId: string,
    data: Record<string, unknown>
  ): Promise<void> {
    try {
      const sessionId = data.sessionId as string;
      const command = data.command as string;

      if (!sessionId || !command) {
        this.sendError(deviceId, message.id, 'Missing sessionId or command');
        return;
      }

      const success = terminalManager.executeCommand({ sessionId, command });

      if (success) {
        this.sendResponse(deviceId, message.id, {
          category: 'terminal',
          action: 'command_executed',
          data: { sessionId, command },
        });
      } else {
        this.sendError(deviceId, message.id, 'Session not found or inactive');
      }
    } catch (error) {
      logger.error(`Failed to execute terminal command: ${(error as Error).message}`, {
        context: 'TerminalHandler',
        metadata: { deviceId, error: (error as Error).message },
      });
      this.sendError(deviceId, message.id, 'Failed to execute command');
    }
  }

  private async handleResize(
    message: WebSocketMessage,
    deviceId: string,
    data: Record<string, unknown>
  ): Promise<void> {
    try {
      const sessionId = data.sessionId as string;
      const cols = data.cols as number;
      const rows = data.rows as number;

      if (!sessionId || cols === undefined || rows === undefined) {
        this.sendError(deviceId, message.id, 'Missing sessionId, cols or rows');
        return;
      }

      const success = terminalManager.resize({ sessionId, cols, rows });

      if (success) {
        this.sendResponse(deviceId, message.id, {
          category: 'terminal',
          action: 'resized',
          data: { sessionId, cols, rows },
        });
      } else {
        this.sendError(deviceId, message.id, 'Session not found or inactive');
      }
    } catch (error) {
      logger.error(`Failed to resize terminal: ${(error as Error).message}`, {
        context: 'TerminalHandler',
        metadata: { deviceId, error: (error as Error).message },
      });
      this.sendError(deviceId, message.id, 'Failed to resize terminal');
    }
  }

  private async handleCloseSession(
    message: WebSocketMessage,
    deviceId: string,
    data: Record<string, unknown>
  ): Promise<void> {
    try {
      const sessionId = data.sessionId as string;

      if (!sessionId) {
        this.sendError(deviceId, message.id, 'Missing sessionId');
        return;
      }

      this.unsubscribeDeviceFromSession(deviceId, sessionId);
      const success = terminalManager.closeSession(sessionId);

      if (success) {
        this.sendResponse(deviceId, message.id, {
          category: 'terminal',
          action: 'session_closed',
          data: { sessionId },
        });
      } else {
        this.sendError(deviceId, message.id, 'Session not found');
      }
    } catch (error) {
      logger.error(`Failed to close terminal session: ${(error as Error).message}`, {
        context: 'TerminalHandler',
        metadata: { deviceId, error: (error as Error).message },
      });
      this.sendError(deviceId, message.id, 'Failed to close session');
    }
  }

  private async handleListSessions(
    message: WebSocketMessage,
    deviceId: string
  ): Promise<void> {
    try {
      const sessions = terminalManager.getAllSessions();
      this.sendResponse(deviceId, message.id, {
        category: 'terminal',
        action: 'sessions_list',
        data: { sessions },
      });
    } catch (error) {
      logger.error(`Failed to list terminal sessions: ${(error as Error).message}`, {
        context: 'TerminalHandler',
        metadata: { deviceId, error: (error as Error).message },
      });
      this.sendError(deviceId, message.id, 'Failed to list sessions');
    }
  }

  private async handleSubscribeOutput(
    message: WebSocketMessage,
    deviceId: string,
    data: Record<string, unknown>
  ): Promise<void> {
    try {
      const sessionId = data.sessionId as string;

      if (!sessionId) {
        this.sendError(deviceId, message.id, 'Missing sessionId');
        return;
      }

      const session = terminalManager.getSession(sessionId);
      if (!session) {
        this.sendError(deviceId, message.id, 'Session not found');
        return;
      }

      this.subscribeDeviceToSession(deviceId, sessionId);

      const callback = (output: TerminalOutput) => {
        this.sendTerminalOutputToSubscribers(sessionId, output);
      };

      this.storeDeviceCallback(deviceId, sessionId, callback);
      terminalManager.registerOutputCallback(sessionId, callback);

      this.sendResponse(deviceId, message.id, {
        category: 'terminal',
        action: 'subscribed',
        data: { sessionId },
      });

      logger.info(`Device ${deviceId} subscribed to terminal output: ${sessionId}`, {
        context: 'TerminalHandler',
        metadata: { deviceId, sessionId },
      });
    } catch (error) {
      logger.error(`Failed to subscribe to terminal output: ${(error as Error).message}`, {
        context: 'TerminalHandler',
        metadata: { deviceId, error: (error as Error).message },
      });
      this.sendError(deviceId, message.id, 'Failed to subscribe to output');
    }
  }

  private async handleUnsubscribeOutput(
    message: WebSocketMessage,
    deviceId: string,
    data: Record<string, unknown>
  ): Promise<void> {
    try {
      const sessionId = data.sessionId as string;

      if (!sessionId) {
        this.sendError(deviceId, message.id, 'Missing sessionId');
        return;
      }

      const callback = this.getDeviceCallback(deviceId, sessionId);
      if (callback) {
        terminalManager.unregisterOutputCallback(sessionId, callback);
      }

      this.unsubscribeDeviceFromSession(deviceId, sessionId);

      this.sendResponse(deviceId, message.id, {
        category: 'terminal',
        action: 'unsubscribed',
        data: { sessionId },
      });

      logger.info(`Device ${deviceId} unsubscribed from terminal output: ${sessionId}`, {
        context: 'TerminalHandler',
        metadata: { deviceId, sessionId },
      });
    } catch (error) {
      logger.error(`Failed to unsubscribe from terminal output: ${(error as Error).message}`, {
        context: 'TerminalHandler',
        metadata: { deviceId, error: (error as Error).message },
      });
      this.sendError(deviceId, message.id, 'Failed to unsubscribe from output');
    }
  }

  private subscribeDeviceToSession(deviceId: string, sessionId: string): void {
    if (!this.outputSubscriptions.has(sessionId)) {
      this.outputSubscriptions.set(sessionId, new Set());
    }
    this.outputSubscriptions.get(sessionId)!.add(deviceId);
  }

  private unsubscribeDeviceFromSession(deviceId: string, sessionId: string): void {
    const subscribers = this.outputSubscriptions.get(sessionId);
    if (subscribers) {
      subscribers.delete(deviceId);
      if (subscribers.size === 0) {
        this.outputSubscriptions.delete(sessionId);
      }
    }
    this.removeDeviceCallback(deviceId, sessionId);
  }

  private storeDeviceCallback(deviceId: string, sessionId: string, callback: (output: TerminalOutput) => void): void {
    if (!this.deviceCallbacks.has(sessionId)) {
      this.deviceCallbacks.set(sessionId, new Map());
    }
    this.deviceCallbacks.get(sessionId)!.set(deviceId, callback);
  }

  private getDeviceCallback(deviceId: string, sessionId: string): ((output: TerminalOutput) => void) | undefined {
    return this.deviceCallbacks.get(sessionId)?.get(deviceId);
  }

  private removeDeviceCallback(deviceId: string, sessionId: string): void {
    this.deviceCallbacks.get(sessionId)?.delete(deviceId);
    if (this.deviceCallbacks.get(sessionId)?.size === 0) {
      this.deviceCallbacks.delete(sessionId);
    }
  }

  private sendTerminalOutputToSubscribers(sessionId: string, output: TerminalOutput): void {
    const subscribers = this.outputSubscriptions.get(sessionId);
    if (!subscribers) return;

    for (const deviceId of subscribers) {
      this.sendEvent(deviceId, {
        category: 'terminal_output',
        data: output,
      });
    }
  }

  private sendResponse(
    deviceId: string,
    requestId: string,
    payload: CommandPayload
  ): void {
    const connection = this.connectionManager.getConnection(deviceId);
    if (!connection) return;

    const message: WebSocketMessage = {
      type: 'event',
      id: `evt-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      deviceId: 'server',
      payload: {
        category: payload.category,
        data: {
          ...payload.data,
          requestId,
        },
      } as EventPayload,
    };

    if (connection.ws.readyState === 1) {
      connection.ws.send(JSON.stringify(message));
    }
  }

  private sendError(deviceId: string, requestId: string, errorMessage: string): void {
    const connection = this.connectionManager.getConnection(deviceId);
    if (!connection) return;

    const message: WebSocketMessage = {
      type: 'event',
      id: `evt-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      deviceId: 'server',
      payload: {
        category: 'error',
        data: {
          code: 'TERMINAL_ERROR',
          message: errorMessage,
          requestId,
        },
      },
    };

    if (connection.ws.readyState === 1) {
      connection.ws.send(JSON.stringify(message));
    }
  }

  private sendEvent(deviceId: string, payload: { category: string; data: any }): void {
    const connection = this.connectionManager.getConnection(deviceId);
    if (!connection) return;

    const message: WebSocketMessage = {
      type: 'event',
      id: `evt-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      deviceId: 'server',
      payload,
    };

    if (connection.ws.readyState === 1) {
      connection.ws.send(JSON.stringify(message));
    }
  }

  cleanup(): void {
    for (const sessionId of this.outputSubscriptions.keys()) {
      terminalManager.unregisterOutputCallback(sessionId);
    }
    this.outputSubscriptions.clear();
    this.deviceCallbacks.clear();
  }
}
