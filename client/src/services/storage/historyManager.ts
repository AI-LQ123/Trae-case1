import AsyncStorage from '@react-native-async-storage/async-storage';
import { ChatSession, ChatMessage } from '../../state/slices/chatSlice';
import { Task } from '../../types/task';
import { TerminalCommand } from '../../state/slices/terminalSlice';

export enum HistoryType {
  CHAT = 'chat',
  TASK = 'task',
  TERMINAL = 'terminal',
}

export interface HistoryItem {
  id: string;
  type: HistoryType;
  title: string;
  preview: string;
  timestamp: number;
  data: ChatSession | Task | TerminalCommand;
}

const STORAGE_KEYS = {
  CHAT_HISTORY: '@trae_chat_history',
  TASK_HISTORY: '@trae_task_history',
  TERMINAL_HISTORY: '@trae_terminal_history',
};

export class HistoryManager {
  private static instance: HistoryManager;

  private constructor() {}

  public static getInstance(): HistoryManager {
    if (!HistoryManager.instance) {
      HistoryManager.instance = new HistoryManager();
    }
    return HistoryManager.instance;
  }

  async saveChatSession(session: ChatSession, messages: ChatMessage[]): Promise<void> {
    try {
      const existingHistory = await this.getChatHistory();
      const index = existingHistory.findIndex(s => s.id === session.id);
      
      if (index >= 0) {
        existingHistory[index] = { ...session, messages };
      } else {
        existingHistory.unshift({ ...session, messages });
      }

      await AsyncStorage.setItem(
        STORAGE_KEYS.CHAT_HISTORY,
        JSON.stringify(existingHistory)
      );
    } catch (error) {
      console.error('Error saving chat history:', error);
    }
  }

  async getChatHistory(): Promise<Array<ChatSession & { messages?: ChatMessage[] }>> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.CHAT_HISTORY);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Error loading chat history:', error);
      return [];
    }
  }

  async saveTask(task: Task): Promise<void> {
    try {
      const existingHistory = await this.getTaskHistory();
      const index = existingHistory.findIndex(t => t.id === task.id);
      
      if (index >= 0) {
        existingHistory[index] = task;
      } else {
        existingHistory.unshift(task);
      }

      await AsyncStorage.setItem(
        STORAGE_KEYS.TASK_HISTORY,
        JSON.stringify(existingHistory)
      );
    } catch (error) {
      console.error('Error saving task history:', error);
    }
  }

  async getTaskHistory(): Promise<Task[]> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.TASK_HISTORY);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Error loading task history:', error);
      return [];
    }
  }

  async saveTerminalCommand(command: TerminalCommand): Promise<void> {
    try {
      const existingHistory = await this.getTerminalHistory();
      const index = existingHistory.findIndex(c => c.id === command.id);
      
      if (index >= 0) {
        existingHistory[index] = command;
      } else {
        existingHistory.unshift(command);
      }

      await AsyncStorage.setItem(
        STORAGE_KEYS.TERMINAL_HISTORY,
        JSON.stringify(existingHistory)
      );
    } catch (error) {
      console.error('Error saving terminal history:', error);
    }
  }

  async getTerminalHistory(): Promise<TerminalCommand[]> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.TERMINAL_HISTORY);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Error loading terminal history:', error);
      return [];
    }
  }

  async searchHistory(query: string, types?: HistoryType[]): Promise<HistoryItem[]> {
    try {
      const results: HistoryItem[] = [];
      const searchQuery = query.toLowerCase();

      if (!types || types.includes(HistoryType.CHAT)) {
        const chatHistory = await this.getChatHistory();
        chatHistory.forEach(session => {
          const shouldInclude = 
            session.title.toLowerCase().includes(searchQuery) ||
            (session.messages && session.messages.some(msg => 
              msg.content.toLowerCase().includes(searchQuery)
            ));

          if (shouldInclude) {
            const preview = session.messages && session.messages.length > 0
              ? session.messages[session.messages.length - 1].content.substring(0, 100)
              : '';
            results.push({
              id: session.id,
              type: HistoryType.CHAT,
              title: session.title,
              preview,
              timestamp: session.updatedAt,
              data: session,
            });
          }
        });
      }

      if (!types || types.includes(HistoryType.TASK)) {
        const taskHistory = await this.getTaskHistory();
        taskHistory.forEach(task => {
          const shouldInclude = 
            task.name.toLowerCase().includes(searchQuery) ||
            task.command.toLowerCase().includes(searchQuery) ||
            (task.output && task.output.toLowerCase().includes(searchQuery));

          if (shouldInclude) {
            results.push({
              id: task.id,
              type: HistoryType.TASK,
              title: task.name,
              preview: task.command.substring(0, 100),
              timestamp: task.completedAt || task.createdAt,
              data: task,
            });
          }
        });
      }

      if (!types || types.includes(HistoryType.TERMINAL)) {
        const terminalHistory = await this.getTerminalHistory();
        terminalHistory.forEach(command => {
          if (command.command.toLowerCase().includes(searchQuery)) {
            results.push({
              id: command.id,
              type: HistoryType.TERMINAL,
              title: command.command,
              preview: command.command,
              timestamp: command.timestamp,
              data: command,
            });
          }
        });
      }

      return results.sort((a, b) => b.timestamp - a.timestamp);
    } catch (error) {
      console.error('Error searching history:', error);
      return [];
    }
  }

  async clearHistory(type?: HistoryType): Promise<void> {
    try {
      if (!type) {
        await Promise.all([
          AsyncStorage.removeItem(STORAGE_KEYS.CHAT_HISTORY),
          AsyncStorage.removeItem(STORAGE_KEYS.TASK_HISTORY),
          AsyncStorage.removeItem(STORAGE_KEYS.TERMINAL_HISTORY),
        ]);
      } else {
        const keyMap: Record<HistoryType, string> = {
          [HistoryType.CHAT]: STORAGE_KEYS.CHAT_HISTORY,
          [HistoryType.TASK]: STORAGE_KEYS.TASK_HISTORY,
          [HistoryType.TERMINAL]: STORAGE_KEYS.TERMINAL_HISTORY,
        };
        await AsyncStorage.removeItem(keyMap[type]);
      }
    } catch (error) {
      console.error('Error clearing history:', error);
    }
  }
}

export default HistoryManager.getInstance();
