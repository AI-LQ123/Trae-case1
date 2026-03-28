import { ChatStore, ChatSession } from './chatStore';
import { ChatMessage } from '../models/types';
import fs from 'fs';
import path from 'path';

const STORAGE_DIR = path.join(__dirname, '../../storage');
const SESSIONS_FILE = path.join(STORAGE_DIR, 'chat-sessions.json');

describe('ChatStore', () => {
  let chatStore: ChatStore;
  const sessionId = 'test-session';

  beforeEach(async () => {
    // 清理存储文件
    if (fs.existsSync(SESSIONS_FILE)) {
      fs.unlinkSync(SESSIONS_FILE);
    }
    chatStore = new ChatStore();
    // 等待存储加载完成
    await new Promise(resolve => setTimeout(resolve, 100));
  });

  afterEach(() => {
    // 清理存储文件
    if (fs.existsSync(SESSIONS_FILE)) {
      fs.unlinkSync(SESSIONS_FILE);
    }
  });

  test('should create a new session', async () => {
    const session = await chatStore.createSession(sessionId);
    expect(session).toBeDefined();
    expect(session.id).toBe(sessionId);
    expect(session.messages).toHaveLength(0);
    expect(session.createdAt).toBeDefined();
    expect(session.lastUpdated).toBeDefined();
  });

  test('should get an existing session', async () => {
    await chatStore.createSession(sessionId);
    const session = chatStore.getSession(sessionId);
    expect(session).toBeDefined();
    expect(session?.id).toBe(sessionId);
  });

  test('should add message to session', async () => {
    await chatStore.createSession(sessionId);
    const message: ChatMessage = {
      id: 'test-message',
      role: 'user',
      content: 'Hello, AI!',
      timestamp: new Date().toISOString(),
    };
    await chatStore.addMessage(sessionId, message);
    const session = chatStore.getSession(sessionId);
    expect(session?.messages).toHaveLength(1);
    expect(session?.messages[0]).toEqual(message);
  });

  test('should truncate messages when exceeding limit', async () => {
    await chatStore.createSession(sessionId);
    
    // 添加101条消息
    for (let i = 0; i < 101; i++) {
      const message: ChatMessage = {
        id: `test-message-${i}`,
        role: 'user',
        content: `Message ${i}`,
        timestamp: new Date().toISOString(),
      };
      await chatStore.addMessage(sessionId, message);
    }
    
    const session = chatStore.getSession(sessionId);
    expect(session?.messages).toHaveLength(100); // 应该被截断为100条
  });

  test('should delete session', async () => {
    await chatStore.createSession(sessionId);
    await chatStore.deleteSession(sessionId);
    const session = chatStore.getSession(sessionId);
    expect(session).toBeUndefined();
  });

  test('should get all sessions', async () => {
    await chatStore.createSession(sessionId);
    const sessionId2 = 'test-session-2';
    await chatStore.createSession(sessionId2);
    const sessions = chatStore.getAllSessions();
    expect(sessions).toHaveLength(2);
    expect(sessions.find(s => s.id === sessionId)).toBeDefined();
    expect(sessions.find(s => s.id === sessionId2)).toBeDefined();
  });

  test('should cleanup expired sessions', async () => {
    await chatStore.createSession(sessionId);
    
    // 创建一个过期的会话
    const expiredSessionId = 'expired-session';
    await chatStore.createSession(expiredSessionId);
    
    // 手动修改会话的lastUpdated时间为31天前
    const session = chatStore.getSession(expiredSessionId);
    if (session) {
      session.lastUpdated = new Date(Date.now() - 31 * 24 * 60 * 60 * 1000);
    }
    
    // 清理过期会话
    const deletedCount = await chatStore.cleanupExpiredSessions();
    expect(deletedCount).toBe(1);
    
    // 验证过期会话已被删除
    const expiredSession = chatStore.getSession(expiredSessionId);
    expect(expiredSession).toBeUndefined();
    
    // 验证正常会话仍然存在
    const normalSession = chatStore.getSession(sessionId);
    expect(normalSession).toBeDefined();
  });

  test('should handle concurrent writes', async () => {
    await chatStore.createSession(sessionId);
    
    // 并发添加多条消息
    const messages: ChatMessage[] = [];
    for (let i = 0; i < 10; i++) {
      messages.push({
        id: `test-message-${i}`,
        role: 'user',
        content: `Message ${i}`,
        timestamp: new Date().toISOString(),
      });
    }
    
    // 并行添加消息
    await Promise.all(messages.map(message => chatStore.addMessage(sessionId, message)));
    
    // 验证所有消息都被添加
    const session = chatStore.getSession(sessionId);
    expect(session?.messages).toHaveLength(10);
  });

  test('should support pagination in getAllSessions', async () => {
    // 创建多个会话
    for (let i = 0; i < 25; i++) {
      await chatStore.createSession(`session-${i}`);
    }
    
    // 测试第一页，每页10条
    const firstPage = chatStore.getAllSessions(1, 10);
    expect(firstPage).toHaveLength(10);
    
    // 测试第二页，每页10条
    const secondPage = chatStore.getAllSessions(2, 10);
    expect(secondPage).toHaveLength(10);
    
    // 测试第三页，每页10条
    const thirdPage = chatStore.getAllSessions(3, 10);
    expect(thirdPage).toHaveLength(5); // 剩下的5条
    
    // 测试默认分页
    const defaultPage = chatStore.getAllSessions();
    expect(defaultPage).toHaveLength(25); // 默认每页100条，所以返回所有25条会话
  });
});
