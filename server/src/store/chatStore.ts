import { ChatMessage } from '../models/types';
import fs from 'fs';
import path from 'path';

export interface ChatSession {
  id: string;
  messages: ChatMessage[];
  createdAt: Date;
  lastUpdated: Date;
}

const STORAGE_DIR = path.join(__dirname, '../../storage');
const SESSIONS_FILE = path.join(STORAGE_DIR, 'chat-sessions.json');

// 确保存储目录存在
if (!fs.existsSync(STORAGE_DIR)) {
  fs.mkdirSync(STORAGE_DIR, { recursive: true });
}

export class ChatStore {
  private sessions: Map<string, ChatSession> = new Map();
  private loaded = false;

  constructor() {
    this.loadSessions();
  }

  private loadSessions(): void {
    try {
      if (fs.existsSync(SESSIONS_FILE)) {
        const data = fs.readFileSync(SESSIONS_FILE, 'utf8');
        const sessions = JSON.parse(data);
        
        // 转换日期字符串为Date对象
        sessions.forEach((session: any) => {
          session.createdAt = new Date(session.createdAt);
          session.lastUpdated = new Date(session.lastUpdated);
          this.sessions.set(session.id, session);
        });
      }
    } catch (error) {
      console.error('Failed to load chat sessions:', error);
    } finally {
      this.loaded = true;
    }
  }

  private saveSessions(): void {
    if (!this.loaded) return;
    
    try {
      const sessions = Array.from(this.sessions.values());
      fs.writeFileSync(SESSIONS_FILE, JSON.stringify(sessions, null, 2));
    } catch (error) {
      console.error('Failed to save chat sessions:', error);
    }
  }

  createSession(sessionId: string): ChatSession {
    const session: ChatSession = {
      id: sessionId,
      messages: [],
      createdAt: new Date(),
      lastUpdated: new Date(),
    };
    this.sessions.set(sessionId, session);
    this.saveSessions();
    return session;
  }

  getSession(sessionId: string): ChatSession | undefined {
    return this.sessions.get(sessionId);
  }

  addMessage(sessionId: string, message: ChatMessage): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.messages.push(message);
      session.lastUpdated = new Date();
      
      // 截断消息，保持每个会话的消息数量在合理范围内
      this.truncateMessages(session);
      
      this.saveSessions();
    }
  }

  // 截断会话消息，保持消息数量在合理范围内
  private truncateMessages(session: ChatSession): void {
    const MAX_MESSAGES = 100; // 每个会话最多保留100条消息
    const MAX_DAYS = 7; // 只保留最近7天的消息
    
    // 按数量截断
    if (session.messages.length > MAX_MESSAGES) {
      session.messages = session.messages.slice(-MAX_MESSAGES);
    }
    
    // 按时间截断
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - MAX_DAYS);
    
    session.messages = session.messages.filter(message => {
      const messageDate = new Date(message.timestamp);
      return messageDate > cutoffDate;
    });
  }

  deleteSession(sessionId: string): void {
    this.sessions.delete(sessionId);
    this.saveSessions();
  }

  getAllSessions(): ChatSession[] {
    return Array.from(this.sessions.values());
  }

  // 清理过期会话（超过30天的会话）
  cleanupExpiredSessions(): number {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    let deletedCount = 0;

    for (const [sessionId, session] of this.sessions.entries()) {
      if (session.lastUpdated < thirtyDaysAgo) {
        this.sessions.delete(sessionId);
        deletedCount++;
      }
    }

    if (deletedCount > 0) {
      this.saveSessions();
    }

    return deletedCount;
  }
}

export const chatStore = new ChatStore();
