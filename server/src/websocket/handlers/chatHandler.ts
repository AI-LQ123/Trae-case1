import { WebSocket } from 'ws';
import { ChatMessage, WebSocketMessage } from '../../models/types';
import { chatStore } from '../../store/chatStore';
import { aiService, AIError } from '../../services/aiService';

// 定义payload类型
interface ChatPayload {
  sessionId?: string;
  message?: ChatMessage;
}

export class ChatHandler {
  private connection: WebSocket;
  private deviceId: string;
  private messageQueue: Map<string, Promise<void>> = new Map();
  private static readonly QUEUE_TIMEOUT = 5 * 60 * 1000; // 5分钟超时

  constructor(connection: WebSocket, deviceId: string) {
    this.connection = connection;
    this.deviceId = deviceId;
  }

  async handleChatMessage(message: WebSocketMessage): Promise<void> {
    if (message.type === 'chat:send') {
      await this.handleSendMessage(message);
    } else if (message.type === 'chat:history') {
      this.handleGetHistory(message);
    } else if (message.type === 'chat:clear') {
      await this.handleClearChat(message);
    }
  }

  private async handleSendMessage(message: WebSocketMessage): Promise<void> {
    try {
      // 使用ChatPayload类型
      const payload = message.payload as ChatPayload;
      const chatMessage = payload?.message as ChatMessage;
      
      // 确保消息有正确的格式
      if (!chatMessage || !chatMessage.content || !chatMessage.role) {
        this.sendError('Invalid chat message format');
        return;
      }

      // 从消息中获取会话ID
      const sessionId = this.getSessionIdFromMessage(message);

      // 使用消息队列处理，确保同一会话的消息串行处理
      await this.processMessageWithQueue(sessionId, async () => {
        // 获取或创建会话
        let session = chatStore.getSession(sessionId);
        if (!session) {
          session = await chatStore.createSession(sessionId);
        }

        // 添加用户消息到会话
        await chatStore.addMessage(sessionId, chatMessage);

        // 发送消息确认给客户端
        this.sendToClient({
          type: 'chat:message',
          id: this.generateMessageId(),
          timestamp: Date.now(),
          deviceId: 'server',
          payload: chatMessage,
        });

        // 如果是用户消息，生成AI响应
        if (chatMessage.role === 'user') {
          try {
            // 获取会话历史作为上下文
            const context = session.messages.slice(-10);
            
            // 生成AI响应
            const aiResponse = await aiService.generateResponse(chatMessage.content, context);
            
            // 创建AI消息
            const aiMessage: ChatMessage = {
              id: `ai-${Date.now()}`,
              role: 'assistant',
              content: aiResponse,
              timestamp: new Date().toISOString(),
            };
            
            // 添加AI消息到会话
            await chatStore.addMessage(sessionId, aiMessage);
            
            // 发送AI响应给客户端
            this.sendToClient({
              type: 'chat:message',
              id: this.generateMessageId(),
              timestamp: Date.now(),
              deviceId: 'server',
              payload: aiMessage,
            });
          } catch (error) {
            console.error('Error generating AI response:', error);
            if (error instanceof AIError) {
              const friendlyError = aiService.getFriendlyError(error);
              this.sendError(friendlyError);
            } else {
              this.sendError('Failed to generate AI response');
            }
          }
        }
      });
    } catch (error) {
      console.error('Error handling chat message:', error);
      if (error instanceof Error && error.message === 'Invalid sessionId') {
        // 错误已经在getSessionIdFromMessage中发送，这里不需要重复发送
        return;
      } else {
        this.sendError('Failed to handle chat message');
      }
    }
  }

  private handleGetHistory(message: WebSocketMessage): void {
    const sessionId = this.getSessionIdFromMessage(message);
    const session = chatStore.getSession(sessionId);
    if (session) {
      this.sendToClient({
        type: 'chat:history',
        id: this.generateMessageId(),
        timestamp: Date.now(),
        deviceId: 'server',
        payload: session.messages,
      });
    } else {
      this.sendToClient({
        type: 'chat:history',
        id: this.generateMessageId(),
        timestamp: Date.now(),
        deviceId: 'server',
        payload: [],
      });
    }
  }

  private async handleClearChat(message: WebSocketMessage): Promise<void> {
    const sessionId = this.getSessionIdFromMessage(message);
    await chatStore.deleteSession(sessionId);
    await chatStore.createSession(sessionId);
    
    this.sendToClient({
      type: 'chat:cleared',
      id: this.generateMessageId(),
      timestamp: Date.now(),
      deviceId: 'server',
      payload: null,
    });
  }

  private getSessionIdFromMessage(message: WebSocketMessage): string {
    // 从消息payload中获取sessionId
    const payload = message.payload as ChatPayload;
    if (!payload?.sessionId || typeof payload.sessionId !== 'string') {
      this.sendError('Missing or invalid sessionId in chat:send message');
      throw new Error('Invalid sessionId');
    }
    return payload.sessionId;
  }

  private generateMessageId(): string {
    return `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private sendToClient(message: WebSocketMessage): void {
    if (this.connection.readyState === WebSocket.OPEN) {
      this.connection.send(JSON.stringify(message));
    }
  }

  private sendError(errorMessage: string): void {
    this.sendToClient({
      type: 'error',
      id: this.generateMessageId(),
      timestamp: Date.now(),
      deviceId: 'server',
      payload: {
        message: errorMessage,
      },
    });
  }

  private async processMessageWithQueue(sessionId: string, handler: () => Promise<void>): Promise<void> {
    // 为每个队列任务设置超时定时器
    const timeoutId = setTimeout(() => {
      const pending = this.messageQueue.get(sessionId);
      if (pending) {
        this.messageQueue.delete(sessionId);
        this.sendError('Message processing timeout');
      }
    }, ChatHandler.QUEUE_TIMEOUT);

    try {
      const previous = this.messageQueue.get(sessionId) || Promise.resolve();
      const current = previous.then(() => handler()).finally(() => clearTimeout(timeoutId));
      this.messageQueue.set(sessionId, current);
      await current;
    } finally {
      if (this.messageQueue.get(sessionId) === current) {
        clearTimeout(timeoutId);
        this.messageQueue.delete(sessionId);
      }
    }
  }
}
