import { WebSocket } from 'ws';
import { ChatMessage, WebSocketMessage } from '../../models/types';
import { chatStore } from '../../store/chatStore';
import { aiService } from '../../services/aiService';

export class ChatHandler {
  private connection: WebSocket;
  private sessionId: string;

  constructor(connection: WebSocket, sessionId: string) {
    this.connection = connection;
    this.sessionId = sessionId;
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

    // 获取或创建会话
    let session = chatStore.getSession(this.sessionId);
    if (!session) {
      session = chatStore.createSession(this.sessionId);
    }

    // 添加用户消息到会话
    chatStore.addMessage(this.sessionId, chatMessage);

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
        chatStore.addMessage(this.sessionId, aiMessage);
        
        // 发送AI响应给客户端
        this.sendToClient({
          type: 'chat:message',
          payload: aiMessage,
        });
      } catch (error) {
        console.error('Error generating AI response:', error);
        this.sendError('Failed to generate AI response');
      }
    }
  }

  private handleGetHistory(message: WebSocketMessage): void {
    const session = chatStore.getSession(this.sessionId);
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
    chatStore.deleteSession(this.sessionId);
    chatStore.createSession(this.sessionId);
    
    this.sendToClient({
      type: 'chat:cleared',
      payload: null,
    });
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
