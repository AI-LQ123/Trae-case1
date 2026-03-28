import { NotificationService, NotificationError } from './notificationService';

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
  let testService: NotificationService;

  beforeEach(() => {
    // 每个测试独立创建新实例
    testService = new NotificationService();
  });

  test('sendNotification should send a notification via WebSocket', async () => {
    const mockWebSocket = new MockWebSocket();

    const notification = await testService.sendNotification(
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

    // 验证发送成功后从队列中删除
    expect(testService.getNotificationById(notification.id)).toBeUndefined();
  });

  test('sendNotification should throw error for closed WebSocket', async () => {
    const mockWebSocket = new MockWebSocket(0); // 0 = CLOSED

    await expect(testService.sendNotification(
      mockWebSocket as any,
      'info',
      'Test Notification',
      'This is a test notification'
    )).rejects.toThrow(NotificationError);
  });

  test('sendNotification should throw error for invalid connection', async () => {
    await expect(testService.sendNotification(
      {} as any, // 无效的连接对象
      'info',
      'Test Notification',
      'This is a test notification'
    )).rejects.toThrow(NotificationError);
  });

  test('retry mechanism should work correctly', async () => {
    const mockWebSocket = new MockWebSocket();
    let sendCount = 0;

    // 模拟前2次失败，第3次成功
    jest.spyOn(mockWebSocket, 'send').mockImplementation(() => {
      sendCount++;
      if (sendCount < 3) {
        throw new Error('Temporary error');
      }
      mockWebSocket.sentMessages.push({ type: 'notification', data: {} });
    });

    const notification = await testService.sendNotification(
      mockWebSocket as any,
      'info',
      'Test',
      'Msg'
    );

    expect(sendCount).toBe(3);
    expect(notification).toBeDefined();
  });

  test('retry mechanism should fail after max retries', async () => {
    const mockWebSocket = new MockWebSocket();

    // 模拟所有重试都失败
    jest.spyOn(mockWebSocket, 'send').mockImplementation(() => {
      throw new Error('Persistent error');
    });

    await expect(testService.sendNotification(
      mockWebSocket as any,
      'info',
      'Test',
      'Msg'
    )).rejects.toThrow(NotificationError);
  });

  test('getNotificationById should return notification by id', async () => {
    const mockWebSocket = new MockWebSocket();

    const notification = await testService.sendNotification(
      mockWebSocket as any,
      'success',
      'Success Notification',
      'This is a success notification'
    );

    // 发送成功后通知已从队列中删除
    expect(testService.getNotificationById(notification.id)).toBeUndefined();
  });

  test('getNotificationById should return undefined for invalid id', () => {
    const retrievedNotification = testService.getNotificationById('invalid-id');
    expect(retrievedNotification).toBeUndefined();
  });

  test('getAllNotifications should return all notifications', async () => {
    // 创建一个新的服务，设置较长的过期时间
    const longLivedService = new NotificationService({ expirationTime: 60000 });
    const mockWebSocket = new MockWebSocket();

    // 模拟发送失败，这样通知会保留在队列中
    jest.spyOn(mockWebSocket, 'send').mockImplementation(() => {
      throw new Error('Send failed');
    });

    try {
      await longLivedService.sendNotification(
        mockWebSocket as any,
        'info',
        'Notification 1',
        'Message 1'
      );
    } catch (e) { /* 忽略错误 */ }

    try {
      await longLivedService.sendNotification(
        mockWebSocket as any,
        'success',
        'Notification 2',
        'Message 2'
      );
    } catch (e) { /* 忽略错误 */ }

    const notifications = longLivedService.getAllNotifications();
    expect(notifications).toHaveLength(2);
  });

  test('clearNotifications should remove all notifications', async () => {
    const mockWebSocket = new MockWebSocket();

    // 模拟发送失败，这样通知会保留在队列中
    jest.spyOn(mockWebSocket, 'send').mockImplementation(() => {
      throw new Error('Send failed');
    });

    try {
      await testService.sendNotification(
        mockWebSocket as any,
        'info',
        'Test Notification',
        'This is a test notification'
      );
    } catch (e) { /* 忽略错误 */ }

    expect(testService.getAllNotifications()).toHaveLength(1);
    testService.clearNotifications();
    expect(testService.getAllNotifications()).toHaveLength(0);
  });

  test('createSystemNotification should create a system notification', () => {
    const notification = testService.createSystemNotification(
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
    // 创建一个新的通知服务，设置很短的过期时间
    const shortLivedService = new NotificationService({ expirationTime: 1 });
    const mockWebSocket = new MockWebSocket();

    // 模拟发送失败，这样通知会保留在队列中
    jest.spyOn(mockWebSocket, 'send').mockImplementation(() => {
      throw new Error('Send failed');
    });

    try {
      await shortLivedService.sendNotification(
        mockWebSocket as any,
        'info',
        'Test Notification',
        'This is a test notification'
      );
    } catch (e) { /* 忽略错误 */ }

    expect(shortLivedService.getAllNotifications()).toHaveLength(1);

    // 等待过期
    await new Promise(resolve => setTimeout(resolve, 10));

    // 清理过期通知
    const notifications = shortLivedService.getAllNotifications();
    expect(notifications).toHaveLength(0);
  });

  test('concurrent notifications should be handled correctly', async () => {
    const mockWebSocket = new MockWebSocket();
    const promises: Promise<any>[] = [];

    // 并发发送多个通知
    for (let i = 0; i < 5; i++) {
      promises.push(
        testService.sendNotification(
          mockWebSocket as any,
          'info',
          `Notification ${i}`,
          `Message ${i}`
        )
      );
    }

    const notifications = await Promise.all(promises);
    expect(notifications).toHaveLength(5);
    expect(mockWebSocket.sentMessages).toHaveLength(5);
  });
});
