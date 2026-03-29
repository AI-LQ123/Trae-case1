import { WebSocketClient } from './WebSocketClient';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type SyncType = 'chat' | 'tasks' | 'notifications' | 'terminals';

export interface SyncRequest {
  lastSyncTime: number;
  syncTypes: SyncType[];
}

export interface SyncResponse {
  chat?: {
    sessions: any[];
    messages: any[];
  };
  tasks?: any[];
  notifications?: any[];
  terminals?: any[];
  serverTime: number;
}

export interface SyncCallbacks {
  onSyncStart?: () => void;
  onSyncComplete?: (response: SyncResponse) => void;
  onSyncError?: (error: Error) => void;
}

const LAST_SYNC_TIME_KEY = 'last_sync_time';

export class SyncService {
  private wsClient: WebSocketClient;
  private callbacks: SyncCallbacks = {};
  private isSyncing = false;
  private pendingSyncRequest: SyncRequest | null = null;

  constructor(wsClient: WebSocketClient) {
    this.wsClient = wsClient;
  }

  setCallbacks(callbacks: SyncCallbacks): void {
    this.callbacks = callbacks;
  }

  async getLastSyncTime(): Promise<number> {
    try {
      const stored = await AsyncStorage.getItem(LAST_SYNC_TIME_KEY);
      return stored ? parseInt(stored, 10) : 0;
    } catch (error) {
      console.error('Failed to get last sync time:', error);
      return 0;
    }
  }

  private async setLastSyncTime(timestamp: number): Promise<void> {
    try {
      await AsyncStorage.setItem(LAST_SYNC_TIME_KEY, timestamp.toString());
    } catch (error) {
      console.error('Failed to set last sync time:', error);
    }
  }

  async requestSync(syncTypes: SyncType[] = ['chat', 'tasks', 'notifications', 'terminals']): Promise<void> {
    if (this.isSyncing) {
      console.log('Sync already in progress, queuing request');
      this.pendingSyncRequest = { lastSyncTime: await this.getLastSyncTime(), syncTypes };
      return;
    }

    this.isSyncing = true;

    try {
      if (this.callbacks.onSyncStart) {
        this.callbacks.onSyncStart();
      }

      const lastSyncTime = await this.getLastSyncTime();
      const request: SyncRequest = { lastSyncTime, syncTypes };

      const messageId = `sync-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      this.wsClient.send({
        type: 'command',
        id: messageId,
        timestamp: Date.now(),
        payload: {
          category: 'sync',
          action: 'request',
          data: request,
        },
      });

      const response = await this.waitForSyncResponse(messageId);
      
      await this.setLastSyncTime(response.serverTime);

      if (this.callbacks.onSyncComplete) {
        this.callbacks.onSyncComplete(response);
      }

      console.log('Sync completed successfully');
    } catch (error) {
      console.error('Sync failed:', error);
      if (this.callbacks.onSyncError) {
        this.callbacks.onSyncError(error as Error);
      }
    } finally {
      this.isSyncing = false;

      if (this.pendingSyncRequest) {
        const pending = this.pendingSyncRequest;
        this.pendingSyncRequest = null;
        this.requestSync(pending.syncTypes);
      }
    }
  }

  private waitForSyncResponse(_messageId: string): Promise<SyncResponse> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Sync request timed out'));
      }, 30000);

      const unsubscribe = this.wsClient.onMessage('event', (message) => {
        if (message.payload.category === 'sync_response') {
          clearTimeout(timeout);
          unsubscribe();
          resolve(message.payload.data as SyncResponse);
        }
      });
    });
  }

  handleSyncEvent(message: any): void {
    if (message.payload.category === 'sync_response') {
      console.log('Received sync response:', message.payload.data);
    }
  }
}
