import { WebSocket } from 'ws';
import { ChatHandler } from './chatHandler';
import { ChatMessage, WebSocketMessage } from '../../models/types';
import { chatStore } from '../../store/chatStore';

// 模拟WebSocket连接
class MockWebSocket {
  readyState: number = WebSocket.OPEN;
  sentMessages: any[] = [];

  send(message: string): void {
    this.sentMessages.push(JSON.parse(message));
  }
}

describe('ChatHandler', () => {
  let mockWebSocket: any;
  let chatHandler: ChatHandler;
  const sessionId = 'test-session';

  beforeEach(() => {
    mockWebSocket = new MockWebSocket();
    chatHandler = new ChatHandler(mockWebSocket as WebSocket, sessionId);
    // 清理聊天存储
    chatStore.deleteSession(sessionId);
  });

  afterEach(() => {
    chatStore.deleteSession(sessionId);
  });

  test('should handle chat:send message', async () => {
    const chatMessage: ChatMessage = {
      id: 'test-message-1',
      role: 'user',
      content: 'Hello, AI!',
      timestamp: new Date().toISOString(),
    };

    const message: WebSocketMessage = {
      type: 'chat:send',
      id: 'test-msg-1',
      timestamp: Date.now(),
      deviceId: 'test-device',
      payload: chatMessage,
    };

    // 处理消息
    await chatHandler.handleChatMessage(message);

    // 验证消息已发送到客户端
    expect(mockWebSocket.sentMessages).toHaveLength(2);
    expect(mockWebSocket.sentMessages[0].type).toBe('chat:message');
    expect(mockWebSocket.sentMessages[0].payload).toEqual(chatMessage);
    expect(mockWebSocket.sentMessages[1].type).toBe('chat:message');
    expect(mockWebSocket.sentMessages[1].payload.role).toBe('assistant');
  });

  test('should handle chat:history message', async () => {
    // 先添加一些消息到会话
    const chatMessage: ChatMessage = {
      id: 'test-message-1',
      role: 'user',
      content: 'Hello, AI!',
      timestamp: new Date().toISOString(),
    };

    const session = await chatStore.createSession(sessionId);
    await chatStore.addMessage(sessionId, chatMessage);

    const message: WebSocketMessage = {
      type: 'chat:history',
      id: 'test-msg-2',
      timestamp: Date.now(),
      deviceId: 'test-device',
      payload: null,
    };

    // 处理消息
    await chatHandler.handleChatMessage(message);

    // 验证历史消息已发送到客户端
    expect(mockWebSocket.sentMessages).toHaveLength(1);
    expect(mockWebSocket.sentMessages[0].type).toBe('chat:history');
    expect(mockWebSocket.sentMessages[0].payload).toHaveLength(1);
  });

  test('should handle chat:clear message', async () => {
    // 先添加一些消息到会话
    const chatMessage: ChatMessage = {
      id: 'test-message-1',
      role: 'user',
      content: 'Hello, AI!',
      timestamp: new Date().toISOString(),
    };

    const session = await chatStore.createSession(sessionId);
    await chatStore.addMessage(sessionId, chatMessage);

    const message: WebSocketMessage = {
      type: 'chat:clear',
      id: 'test-msg-3',
      timestamp: Date.now(),
      deviceId: 'test-device',
      payload: null,
    };

    // 处理消息
    await chatHandler.handleChatMessage(message);

    // 验证聊天已清除
    expect(mockWebSocket.sentMessages).toHaveLength(1);
    expect(mockWebSocket.sentMessages[0].type).toBe('chat:cleared');

    // 验证会话已重新创建
    const newSession = chatStore.getSession(sessionId);
    expect(newSession).toBeDefined();
    expect(newSession?.messages).toHaveLength(0);
  });

  test('should handle invalid chat message format', async () => {
    const invalidMessage: WebSocketMessage = {
      type: 'chat:send',
      id: 'test-msg-4',
      timestamp: Date.now(),
      deviceId: 'test-device',
      payload: {
        id: 'test-invalid-msg',
        role: 'user',
        content: '', // 空内容，这是无效的消息格式
        timestamp: new Date().toISOString()
      },
    };

    // 处理消息
    await chatHandler.handleChatMessage(invalidMessage);

    // 验证错误消息已发送
    expect(mockWebSocket.sentMessages).toHaveLength(1);
    expect(mockWebSocket.sentMessages[0].type).toBe('error');
  });
});
