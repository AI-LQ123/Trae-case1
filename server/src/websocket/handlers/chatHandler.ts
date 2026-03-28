import { WebSocket } from 'ws';
import { ChatMessage, WebSocketMessage } from '../../models/types';
import { chatStore } from '../../store/chatStore';
import { aiService, AIError } from '../../services/aiService';

export class ChatHandler {
  private connection: WebSocket;
  private deviceId: string;

  constructor(connection: WebSocket, deviceId: string) {
    this.connection = connection;
    this.deviceId = deviceId;
  }

  handleChatMessage(message: WebSocketMessage): void {
    if (message.type === 'chat:send') {
      this.handleSendMessage(message);
    } else if (message.type === 'chat:history') {
      this.handleGetHistory(message);
    } else if (message.type === 'chat:clear') {
      this.handleClearChat(message);
    }
  }

  private async handleSendMessage(message: WebSocketMessage): Promise<void> {
    const chatMessage = message.payload as ChatMessage;
    
    // 确保消息有正确的格式
    if (!chatMessage.content || !chatMessage.role) {
      this.sendError('Invalid chat message format');
      return;
    }

    // 从消息中获取会话ID，如果没有则使用设备ID
    const sessionId = this.getSessionIdFromMessage(message);

    // 获取或创建会话
    let session = chatStore.getSession(sessionId);
    if (!session) {
      session = chatStore.createSession(sessionId);
    }

    // 添加用户消息到会话
    chatStore.addMessage(sessionId, chatMessage);

    // 发送消息确认给客户端
    this.sendToClient({
      type: 'chat:message',
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
        chatStore.addMessage(sessionId, aiMessage);
        
        // 发送AI响应给客户端
        this.sendToClient({
          type: 'chat:message',
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
  }

  private handleGetHistory(message: WebSocketMessage): void {
    const sessionId = this.getSessionIdFromMessage(message);
    const session = chatStore.getSession(sessionId);
    if (session) {
      this.sendToClient({
        type: 'chat:history',
        payload: session.messages,
      });
    } else {
      this.sendToClient({
        type: 'chat:history',
        payload: [],
      });
    }
  }

  private handleClearChat(message: WebSocketMessage): void {
    const sessionId = this.getSessionIdFromMessage(message);
    chatStore.deleteSession(sessionId);
    chatStore.createSession(sessionId);
    
    this.sendToClient({
      type: 'chat:cleared',
      payload: null,
    });
  }

  private getSessionIdFromMessage(message: WebSocketMessage): string {
    // 从消息payload中获取sessionId，如果没有则使用deviceId
    if (message.payload && typeof message.payload === 'object' && 'sessionId' in message.payload) {
      return (message.payload as any).sessionId;
    }
    return this.deviceId;
  }

  private sendToClient(message: WebSocketMessage): void {
    if (this.connection.readyState === WebSocket.OPEN) {
      this.connection.send(JSON.stringify(message));
    }
  }

  private sendError(errorMessage: string): void {
    this.sendToClient({
      type: 'error',
      payload: {
        message: errorMessage,
      },
    });
  }
}
