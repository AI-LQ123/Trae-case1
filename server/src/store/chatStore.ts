import { ChatMessage } from '../models/types';

export interface ChatSession {
  id: string;
  messages: ChatMessage[];
  createdAt: Date;
  lastUpdated: Date;
}

export class ChatStore {
  private sessions: Map<string, ChatSession> = new Map();

  createSession(sessionId: string): ChatSession {
    const session: ChatSession = {
      id: sessionId,
      messages: [],
      createdAt: new Date(),
      lastUpdated: new Date(),
    };
    this.sessions.set(sessionId, session);
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
    }
  }

  deleteSession(sessionId: string): void {
    this.sessions.delete(sessionId);
  }

  getAllSessions(): ChatSession[] {
    return Array.from(this.sessions.values());
  }
}

export const chatStore = new ChatStore();
