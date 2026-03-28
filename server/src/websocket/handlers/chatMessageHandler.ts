import { WebSocket } from 'ws';
import { WebSocketMessage } from '../../models/types';
import { ChatHandler } from './chatHandler';
import { MessageHandler } from '../messageRouter';
import { ConnectionManager } from '../connectionManager';

export class ChatMessageHandler implements MessageHandler {
  private connectionManager: ConnectionManager;

  constructor(connectionManager: ConnectionManager) {
    this.connectionManager = connectionManager;
  }

  async handle(message: WebSocketMessage, deviceId: string): Promise<void> {
    const connection = this.connectionManager.getConnection(deviceId);
    if (connection) {
      const chatHandler = new ChatHandler(connection.ws, deviceId);
      chatHandler.handleChatMessage(message);
    }
  }
}
