import { WebSocketMessage, CommandPayload, EventPayload } from '../models/types';

export interface MessageHandler {
  handle(message: WebSocketMessage, deviceId: string): Promise<void>;
}

export class MessageRouter {
  private handlers: Map<string, MessageHandler> = new Map();

  registerHandler(type: string, category: string, handler: MessageHandler): void {
    const key = `${type}:${category}`;
    this.handlers.set(key, handler);
  }

  registerCommandHandler(category: string, handler: MessageHandler): void {
    this.registerHandler('command', category, handler);
  }

  registerEventHandler(category: string, handler: MessageHandler): void {
    this.registerHandler('event', category, handler);
  }

  async route(message: WebSocketMessage, deviceId: string): Promise<boolean> {
    let key: string;

    if (message.type === 'command' && 'category' in message.payload) {
      const payload = message.payload as CommandPayload;
      key = `${message.type}:${payload.category}`;
    } else if (message.type === 'event' && 'category' in message.payload) {
      const payload = message.payload as EventPayload;
      key = `${message.type}:${payload.category}`;
    } else {
      key = message.type;
    }

    const handler = this.handlers.get(key);
    if (handler) {
      try {
        await handler.handle(message, deviceId);
        return true;
      } catch (error) {
        console.error(`Error handling message ${key}:`, error);
        return false;
      }
    }

    return false;
  }

  unregisterHandler(type: string, category: string): boolean {
    const key = `${type}:${category}`;
    return this.handlers.delete(key);
  }

  clearHandlers(): void {
    this.handlers.clear();
  }

  getHandlers(): Map<string, MessageHandler> {
    return new Map(this.handlers);
  }
}
