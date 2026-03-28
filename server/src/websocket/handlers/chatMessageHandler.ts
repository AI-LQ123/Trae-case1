import { WebSocket } from 'ws';
import { WebSocketMessage, Connection } from '../../models/types';
import { ChatHandler } from './chatHandler';
import { MessageHandler } from '../messageRouter';

export class ChatMessageHandler implements MessageHandler {
  private connections: Map<string, Connection>;

  constructor(connections: Map<string, Connection>) {
    this.connections = connections;
  }

  async handle(message: WebSocketMessage, deviceId: string): Promise<void> {
    const connection = this.connections.get(deviceId);
    if (connection) {
      const chatHandler = new ChatHandler(connection.ws, deviceId);
      chatHandler.handleChatMessage(message);
    }
  }
}
