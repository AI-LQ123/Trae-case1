import { logger } from '../utils/logger';
import { taskStore } from '../store/taskStore';
import { chatStore } from '../store/chatStore';
import { taskScheduler } from './taskScheduler';
import { terminalManager } from './terminalManager';

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

export class SyncManager {
  private static instance: SyncManager;

  private constructor() {
    logger.info('SyncManager initialized', {
      context: 'SyncManager',
    });
  }

  static getInstance(): SyncManager {
    if (!SyncManager.instance) {
      SyncManager.instance = new SyncManager();
    }
    return SyncManager.instance;
  }

  async getSyncData(request: SyncRequest): Promise<SyncResponse> {
    const response: SyncResponse = {
      serverTime: Date.now(),
    };

    const { lastSyncTime, syncTypes } = request;

    logger.info('Processing sync request', {
      context: 'SyncManager',
      metadata: { lastSyncTime, syncTypes },
    });

    for (const syncType of syncTypes) {
      switch (syncType) {
        case 'chat':
          response.chat = await this.getChatData(lastSyncTime);
          break;
        case 'tasks':
          response.tasks = await this.getTasksData(lastSyncTime);
          break;
        case 'notifications':
          response.notifications = await this.getNotificationsData(lastSyncTime);
          break;
        case 'terminals':
          response.terminals = this.getTerminalsData(lastSyncTime);
          break;
      }
    }

    return response;
  }

  private async getChatData(lastSyncTime: number): Promise<{ sessions: any[]; messages: any[] }> {
    try {
      const allSessions = chatStore.getAllSessions();
      const allMessages = chatStore.getAllMessages();

      const filteredSessions = allSessions.filter(
        session => new Date(session.lastUpdated).getTime() > lastSyncTime
      );

      const filteredMessages = allMessages.filter(
        message => new Date(message.timestamp).getTime() > lastSyncTime
      );

      return {
        sessions: filteredSessions.map(session => ({
          ...session,
          createdAt: new Date(session.createdAt).getTime(),
          updatedAt: new Date(session.lastUpdated).getTime(),
        })),
        messages: filteredMessages.map(message => ({
          ...message,
          createdAt: new Date(message.timestamp).getTime(),
        })),
      };
    } catch (error) {
      logger.error('Failed to get chat sync data', {
        context: 'SyncManager',
        metadata: { error: (error as Error).message },
      });
      return { sessions: [], messages: [] };
    }
  }

  private async getTasksData(lastSyncTime: number): Promise<any[]> {
    try {
      const allTasks = taskStore.getAllTasks();
      
      return allTasks.filter(
        task => task.createdAt > lastSyncTime || 
                (task.startedAt && task.startedAt > lastSyncTime) ||
                (task.completedAt && task.completedAt > lastSyncTime)
      );
    } catch (error) {
      logger.error('Failed to get tasks sync data', {
        context: 'SyncManager',
        metadata: { error: (error as Error).message },
      });
      return [];
    }
  }

  private async getNotificationsData(lastSyncTime: number): Promise<any[]> {
    try {
      return [];
    } catch (error) {
      logger.error('Failed to get notifications sync data', {
        context: 'SyncManager',
        metadata: { error: (error as Error).message },
      });
      return [];
    }
  }

  private getTerminalsData(lastSyncTime: number): any[] {
    try {
      const allSessions = terminalManager.getAllSessions();
      
      return allSessions.filter(
        session => session.createdAt > lastSyncTime
      );
    } catch (error) {
      logger.error('Failed to get terminals sync data', {
        context: 'SyncManager',
        metadata: { error: (error as Error).message },
      });
      return [];
    }
  }
}

export const syncManager = SyncManager.getInstance();
