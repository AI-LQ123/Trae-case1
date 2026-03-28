import { WebSocketMessage, CommandPayload, EventPayload } from '../models/types';
import { logger } from '../utils/logger';

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

    if (message.type === 'command' && message.payload && 'category' in message.payload) {
      const payload = message.payload as CommandPayload;
      key = `${message.type}:${payload.category}`;
    } else if (message.type === 'event' && message.payload && 'category' in message.payload) {
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
        logger.error(`Error handling message ${key}: ${(error as Error).message}`, {
          context: 'MessageRouter',
          metadata: { key, deviceId, error: (error as Error).message },
        });
        return false;
      }
    }

    // 尝试匹配前缀路由，如 'chat:*'
    for (const [handlerKey, handler] of this.handlers.entries()) {
      if (handlerKey.endsWith('*') && key.startsWith(handlerKey.slice(0, -1))) {
        try {
          await handler.handle(message, deviceId);
          return true;
        } catch (error) {
          logger.error(`Error handling message ${key} with prefix handler ${handlerKey}: ${(error as Error).message}`, {
            context: 'MessageRouter',
            metadata: { key, handlerKey, deviceId, error: (error as Error).message },
          });
          return false;
        }
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
