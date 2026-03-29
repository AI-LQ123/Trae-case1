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
    sessions: any[]; // 会话元数据（不包含消息）
    messages: any[]; // 增量消息
    deletedSessionIds?: string[]; // 已删除的会话ID
  };
  tasks?: any[];
  deletedTaskIds?: string[]; // 已删除的任务ID
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
        case 'chat': {
          const chatData = await this.getChatData(lastSyncTime);
          response.chat = {
            sessions: chatData.sessions,
            messages: chatData.messages,
            deletedSessionIds: chatData.deletedSessionIds,
          };
          break;
        }
        case 'tasks': {
          const taskData = await this.getTasksData(lastSyncTime);
          response.tasks = taskData.tasks;
          response.deletedTaskIds = taskData.deletedTaskIds;
          break;
        }
        case 'notifications':
          response.notifications = await this.getNotificationsData(lastSyncTime);
          break;
        case 'terminals':
          response.terminals = await this.getTerminalsData(lastSyncTime);
          break;
      }
    }

    return response;
  }

  private async getChatData(lastSyncTime: number): Promise<{ sessions: any[]; messages: any[]; deletedSessionIds?: string[] }> {
    try {
      // 限制首次同步的数据量（最多100条消息）
      const MAX_MESSAGES = 100;
      const MAX_SESSIONS = 50;

      // 使用增量查询方法，避免全量加载
      const filteredSessions = chatStore.getSessionsAfter(lastSyncTime);
      const filteredMessages = chatStore.getMessagesAfter(lastSyncTime);

      // 限制消息数量，优先返回最新的消息
      const limitedMessages = filteredMessages
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        .slice(0, MAX_MESSAGES);

      // 限制会话数量
      const limitedSessions = filteredSessions
        .sort((a, b) => new Date(b.lastUpdated).getTime() - new Date(a.lastUpdated).getTime())
        .slice(0, MAX_SESSIONS);

      return {
        // 会话元数据（不包含完整消息列表）
        sessions: limitedSessions.map(session => ({
          id: session.id,
          createdAt: new Date(session.createdAt).getTime(),
          updatedAt: new Date(session.lastUpdated).getTime(),
          messageCount: session.messages.length,
          // 不包含 messages 数组，减少数据传输
        })),
        // 增量消息
        messages: limitedMessages.map(message => ({
          ...message,
          createdAt: new Date(message.timestamp).getTime(),
        })),
        // TODO: 从持久化存储中获取已删除的会话ID
        deletedSessionIds: [],
      };
    } catch (error) {
      logger.error('Failed to get chat sync data', {
        context: 'SyncManager',
        metadata: { error: (error as Error).message },
      });
      return { sessions: [], messages: [] };
    }
  }

  private async getTasksData(lastSyncTime: number): Promise<{ tasks: any[]; deletedTaskIds?: string[] }> {
    try {
      // 限制首次同步的数据量（最多50个任务）
      const MAX_TASKS = 50;

      // 使用增量查询方法，避免全量加载
      const tasks = taskStore.getTasksAfter(lastSyncTime);

      // 限制任务数量，优先返回最新的任务
      const limitedTasks = tasks.slice(0, MAX_TASKS);

      return {
        tasks: limitedTasks,
        // TODO: 从持久化存储中获取已删除的任务ID
        deletedTaskIds: [],
      };
    } catch (error) {
      logger.error('Failed to get tasks sync data', {
        context: 'SyncManager',
        metadata: { error: (error as Error).message },
      });
      return { tasks: [] };
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

  private async getTerminalsData(lastSyncTime: number): Promise<any[]> {
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
