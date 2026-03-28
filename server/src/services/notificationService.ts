import { WebSocket } from 'ws';

interface Notification {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message: string;
  timestamp: number;
  data?: Record<string, any>;
}

interface NotificationOptions {
  maxRetries?: number;
  retryDelay?: number;
  expirationTime?: number;
}

export class NotificationError extends Error {
  constructor(public code: string, message: string) {
    super(message);
    this.name = 'NotificationError';
  }
}

export class NotificationService {
  private options: NotificationOptions;
  private notificationQueue: Map<string, Notification> = new Map();

  constructor(options: NotificationOptions = {}) {
    this.options = {
      maxRetries: options.maxRetries || 3,
      retryDelay: options.retryDelay || 1000,
      expirationTime: options.expirationTime || 30000,
    };
  }

  async sendNotification(
    connection: WebSocket,
    type: 'info' | 'success' | 'warning' | 'error',
    title: string,
    message: string,
    data?: Record<string, any>
  ): Promise<Notification> {
    const notification: Notification = {
      id: this.generateId(),
      type,
      title,
      message,
      timestamp: Date.now(),
      data,
    };

    this.notificationQueue.set(notification.id, notification);

    try {
      await this.sendMessage(connection, notification);
      return notification;
    } catch (error) {
      throw new NotificationError('SEND_FAILED', 'Failed to send notification');
    } finally {
      // 清理过期通知
      this.cleanupExpiredNotifications();
    }
  }

  private async sendMessage(connection: WebSocket, notification: Notification): Promise<void> {
    let attempts = 0;

    while (attempts < this.options.maxRetries!) {
      try {
        if (connection.readyState === WebSocket.OPEN) {
          connection.send(JSON.stringify({
            type: 'notification',
            data: notification,
          }));
          return;
        } else {
          throw new NotificationError('CONNECTION_CLOSED', 'WebSocket connection is closed');
        }
      } catch (error) {
        attempts++;

        if (attempts < this.options.maxRetries!) {
          console.warn(`Notification send failed (attempt ${attempts}/${this.options.maxRetries!}):`, error);
          await this.sleep(this.options.retryDelay!);
          continue;
        }

        throw error;
      }
    }
  }

  private generateId(): string {
    return `notification_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private cleanupExpiredNotifications(): void {
    const now = Date.now();
    for (const [id, notification] of this.notificationQueue.entries()) {
      if (now - notification.timestamp > this.options.expirationTime!) {
        this.notificationQueue.delete(id);
      }
    }
  }

  getNotificationById(id: string): Notification | undefined {
    return this.notificationQueue.get(id);
  }

  getAllNotifications(): Notification[] {
    this.cleanupExpiredNotifications();
    return Array.from(this.notificationQueue.values());
  }

  clearNotifications(): void {
    this.notificationQueue.clear();
  }

  // 生成系统通知
  createSystemNotification(
    type: 'info' | 'success' | 'warning' | 'error',
    title: string,
    message: string,
    data?: Record<string, any>
  ): Notification {
    return {
      id: this.generateId(),
      type,
      title,
      message,
      timestamp: Date.now(),
      data,
    };
  }
}

export const notificationService = new NotificationService();