import { WebSocketMessage, CommandPayload } from '../../models/types';
import { MessageHandler } from '../messageRouter';
import { ConnectionManager } from '../connectionManager';
import { syncManager, SyncRequest, SyncType } from '../../services/syncManager';
import { logger } from '../../utils/logger';

export class SyncHandler implements MessageHandler {
  private connectionManager: ConnectionManager;

  constructor(connectionManager: ConnectionManager) {
    this.connectionManager = connectionManager;
  }

  private sendToDevice(deviceId: string, message: WebSocketMessage): void {
    const connection = this.connectionManager.getConnection(deviceId);
    if (connection && connection.ws.readyState === 1) {
      connection.ws.send(JSON.stringify(message));
    }
  }

  private sendError(deviceId: string, id: string, errorMessage: string): void {
    const message: WebSocketMessage = {
      type: 'event',
      id,
      timestamp: Date.now(),
      deviceId: 'server',
      payload: {
        category: 'error',
        data: {
          code: 'SYNC_ERROR',
          message: errorMessage,
        },
      },
    };
    this.sendToDevice(deviceId, message);
  }

  private sendSyncResponse(deviceId: string, id: string, data: any): void {
    const message: WebSocketMessage = {
      type: 'event',
      id,
      timestamp: Date.now(),
      deviceId: 'server',
      payload: {
        category: 'sync_response',
        data,
      },
    };
    this.sendToDevice(deviceId, message);
  }

  async handle(message: WebSocketMessage, deviceId: string): Promise<void> {
    try {
      if (message.type !== 'command' || !message.payload || !('category' in message.payload)) {
        return;
      }

      const payload = message.payload as CommandPayload;
      if (payload.category !== 'sync') {
        return;
      }

      const action = payload.action;
      const data = payload.data;

      logger.info('Handling sync command', {
        context: 'SyncHandler',
        metadata: { deviceId, action, data },
      });

      switch (action) {
        case 'request':
          await this.handleSyncRequest(message.id, deviceId, data);
          break;
        default:
          this.sendError(deviceId, message.id, `Unknown sync action: ${action}`);
      }
    } catch (error) {
      logger.error('Error handling sync command', {
        context: 'SyncHandler',
        metadata: { deviceId, error: (error as Error).message },
      });
      this.sendError(deviceId, message.id, (error as Error).message);
    }
  }

  private async handleSyncRequest(messageId: string, deviceId: string, data: unknown): Promise<void> {
    const syncData = data as Record<string, unknown>;
    if (syncData.lastSyncTime === undefined || !syncData.syncTypes) {
      this.sendError(deviceId, messageId, 'Missing required fields: lastSyncTime and syncTypes');
      return;
    }

    // 验证 syncTypes 数组
    const validSyncTypes: SyncType[] = ['chat', 'tasks', 'notifications', 'terminals'];
    const requestedTypes = (syncData.syncTypes as string[]).filter(type => 
      validSyncTypes.includes(type as SyncType)
    ) as SyncType[];

    if (requestedTypes.length === 0) {
      this.sendError(deviceId, messageId, 'No valid sync types provided');
      return;
    }

    const request: SyncRequest = {
      lastSyncTime: syncData.lastSyncTime as number,
      syncTypes: requestedTypes,
    };

    const response = await syncManager.getSyncData(request);
    this.sendSyncResponse(deviceId, messageId, response);
  }
}
