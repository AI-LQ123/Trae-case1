import { notificationService, NotificationError } from './notificationService';

// 模拟 WebSocket 连接
class MockWebSocket {
  readyState: number;
  sentMessages: any[];

  constructor(readyState: number = 1) {
    this.readyState = readyState;
    this.sentMessages = [];
  }

  send(message: string) {
    if (this.readyState !== 1) {
      throw new Error('WebSocket not open');
    }
    this.sentMessages.push(JSON.parse(message));
  }
}

describe('NotificationService', () => {
  beforeEach(() => {
    // 清理通知队列
    notificationService.clearNotifications();
  });

  test('sendNotification should send a notification via WebSocket', async () => {
    const mockWebSocket = new MockWebSocket();
    
    const notification = await notificationService.sendNotification(
      mockWebSocket as any,
      'info',
      'Test Notification',
      'This is a test notification',
      { test: 'data' }
    );

    expect(notification).toHaveProperty('id');
    expect(notification.type).toBe('info');
    expect(notification.title).toBe('Test Notification');
    expect(notification.message).toBe('This is a test notification');
    expect(notification.data).toEqual({ test: 'data' });
    expect(typeof notification.timestamp).toBe('number');

    // 验证 WebSocket 消息
    expect(mockWebSocket.sentMessages).toHaveLength(1);
    expect(mockWebSocket.sentMessages[0]).toEqual({
      type: 'notification',
      data: notification
    });
  });

  test('sendNotification should throw error for closed WebSocket', async () => {
    const mockWebSocket = new MockWebSocket(0); // 0 = CLOSED

    await expect(notificationService.sendNotification(
      mockWebSocket as any,
      'info',
      'Test Notification',
      'This is a test notification'
    )).rejects.toThrow(NotificationError);
  });

  test('getNotificationById should return notification by id', async () => {
    const mockWebSocket = new MockWebSocket();
    
    const notification = await notificationService.sendNotification(
      mockWebSocket as any,
      'success',
      'Success Notification',
      'This is a success notification'
    );

    const retrievedNotification = notificationService.getNotificationById(notification.id);
    expect(retrievedNotification).toBeTruthy();
    expect(retrievedNotification?.id).toBe(notification.id);
  });

  test('getNotificationById should return undefined for invalid id', () => {
    const retrievedNotification = notificationService.getNotificationById('invalid-id');
    expect(retrievedNotification).toBeUndefined();
  });

  test('getAllNotifications should return all notifications', async () => {
    const mockWebSocket = new MockWebSocket();
    
    await notificationService.sendNotification(
      mockWebSocket as any,
      'info',
      'Notification 1',
      'Message 1'
    );

    await notificationService.sendNotification(
      mockWebSocket as any,
      'success',
      'Notification 2',
      'Message 2'
    );

    const notifications = notificationService.getAllNotifications();
    expect(notifications).toHaveLength(2);
  });

  test('clearNotifications should remove all notifications', async () => {
    const mockWebSocket = new MockWebSocket();
    
    await notificationService.sendNotification(
      mockWebSocket as any,
      'info',
      'Test Notification',
      'This is a test notification'
    );

    expect(notificationService.getAllNotifications()).toHaveLength(1);
    notificationService.clearNotifications();
    expect(notificationService.getAllNotifications()).toHaveLength(0);
  });

  test('createSystemNotification should create a system notification', () => {
    const notification = notificationService.createSystemNotification(
      'warning',
      'System Warning',
      'This is a system warning',
      { system: 'data' }
    );

    expect(notification).toHaveProperty('id');
    expect(notification.type).toBe('warning');
    expect(notification.title).toBe('System Warning');
    expect(notification.message).toBe('This is a system warning');
    expect(notification.data).toEqual({ system: 'data' });
    expect(typeof notification.timestamp).toBe('number');
  });

  test('cleanupExpiredNotifications should remove expired notifications', async () => {
    // 模拟过期时间为1ms
    const mockNotificationService = require('./notificationService');
    const originalService = mockNotificationService.notificationService;
    
    // 创建一个新的通知服务，设置很短的过期时间
    const { NotificationService } = mockNotificationService;
    const testService = new NotificationService({ expirationTime: 1 });
    
    const mockWebSocket = new MockWebSocket();
    
    // 发送通知
    const notification = await testService.sendNotification(
      mockWebSocket as any,
      'info',
      'Test Notification',
      'This is a test notification'
    );

    expect(testService.getAllNotifications()).toHaveLength(1);
    
    // 等待过期
    await new Promise(resolve => setTimeout(resolve, 10));
    
    // 清理过期通知
    const notifications = testService.getAllNotifications();
    expect(notifications).toHaveLength(0);
    
    // 恢复原始服务
    mockNotificationService.notificationService = originalService;
  });
});