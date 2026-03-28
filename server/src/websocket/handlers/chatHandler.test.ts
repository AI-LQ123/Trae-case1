import { WebSocket } from 'ws';
import { ChatHandler } from './chatHandler';
import { ChatMessage, WebSocketMessage } from '../../models/types';
import { chatStore } from '../../store/chatStore';
import { aiService } from '../../services/aiService';

// 模拟WebSocket连接
class MockWebSocket {
  readyState: number = WebSocket.OPEN;
  sentMessages: any[] = [];

  send(message: string): void {
    this.sentMessages.push(JSON.parse(message));
  }
}

// 模拟aiService
jest.mock('../../services/aiService', () => {
  return {
    aiService: {
      generateResponse: jest.fn().mockResolvedValue('Mock AI response'),
      getFriendlyError: jest.fn().mockReturnValue('Friendly error message'),
    },
    AIError: jest.fn().mockImplementation((code: string, message: string) => {
      const error = new Error(message);
      (error as any).code = code;
      return error;
    }),
  };
});

describe('ChatHandler', () => {
  let mockWebSocket: any;
  let chatHandler: ChatHandler;
  const deviceId = 'test-device';
  const sessionId = 'test-session';

  beforeEach(async () => {
    mockWebSocket = new MockWebSocket();
    chatHandler = new ChatHandler(mockWebSocket as WebSocket, deviceId);
    // 清理聊天存储
    await chatStore.deleteSession(sessionId);
  });

  afterEach(async () => {
    await chatStore.deleteSession(sessionId);
  });

  test('should handle chat:send message with sessionId', async () => {
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
      payload: {
        sessionId,
        message: chatMessage,
      },
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

  test('should return error for chat:send message without sessionId', async () => {
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
      payload: {
        message: chatMessage,
      },
    };

    // 处理消息
    await chatHandler.handleChatMessage(message);

    // 验证错误消息已发送
    expect(mockWebSocket.sentMessages).toHaveLength(1);
    expect(mockWebSocket.sentMessages[0].type).toBe('error');
    expect(mockWebSocket.sentMessages[0].payload.message).toBe('sessionId is required for chat messages');
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
      payload: {
        sessionId,
      },
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
      payload: {
        sessionId,
      },
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
        sessionId,
        message: {
          id: 'test-invalid-msg',
          role: 'user',
          content: '', // 空内容，这是无效的消息格式
          timestamp: new Date().toISOString(),
        },
      },
    };

    // 处理消息
    await chatHandler.handleChatMessage(invalidMessage);

    // 验证错误消息已发送
    expect(mockWebSocket.sentMessages).toHaveLength(1);
    expect(mockWebSocket.sentMessages[0].type).toBe('error');
  });

  test('should handle AI service error', async () => {
    // 模拟AI服务错误
    (aiService.generateResponse as jest.Mock).mockRejectedValue(new Error('AI service error'));

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
      payload: {
        sessionId,
        message: chatMessage,
      },
    };

    // 处理消息
    await chatHandler.handleChatMessage(message);

    // 验证错误消息已发送
    expect(mockWebSocket.sentMessages).toHaveLength(2); // 1个消息确认，1个错误
    expect(mockWebSocket.sentMessages[1].type).toBe('error');
  });

  test('should process messages in queue', async () => {
    const chatMessage1: ChatMessage = {
      id: 'test-message-1',
      role: 'user',
      content: 'Hello, AI!',
      timestamp: new Date().toISOString(),
    };

    const chatMessage2: ChatMessage = {
      id: 'test-message-2',
      role: 'user',
      content: 'How are you?',
      timestamp: new Date().toISOString(),
    };

    const message1: WebSocketMessage = {
      type: 'chat:send',
      id: 'test-msg-1',
      timestamp: Date.now(),
      deviceId: 'test-device',
      payload: {
        sessionId,
        message: chatMessage1,
      },
    };

    const message2: WebSocketMessage = {
      type: 'chat:send',
      id: 'test-msg-2',
      timestamp: Date.now(),
      deviceId: 'test-device',
      payload: {
        sessionId,
        message: chatMessage2,
      },
    };

    // 并行处理两个消息
    await Promise.all([
      chatHandler.handleChatMessage(message1),
      chatHandler.handleChatMessage(message2),
    ]);

    // 验证所有消息都已处理
    expect(mockWebSocket.sentMessages).toHaveLength(4); // 2个消息确认，2个AI响应
  });
});
