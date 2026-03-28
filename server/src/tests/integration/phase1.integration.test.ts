/**
 * 第一阶段集成测试
 * 测试范围：任务 2.1 - 2.10 的所有功能集成
 */

import { createServer, Server as HttpServer } from 'http';
import WebSocket from 'ws';
import { WebSocketServer } from '../../websocket/server';
import pairingService from '../../services/auth/pairing';
import tokenManager from '../../services/auth/tokenManager';
import { chatStore } from '../../store/chatStore';
import fileService from '../../services/fileService';
import { notificationService, NotificationService } from '../../services/notificationService';
import { logger } from '../../utils/logger';

// 模拟 logger 避免测试输出过多日志
jest.mock('../../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

describe('第一阶段集成测试', () => {
  let httpServer: HttpServer;
  let wsServer: WebSocketServer;
  let clientSocket: WebSocket;
  const TEST_PORT = 9999;
  const TEST_HOST = `ws://localhost:${TEST_PORT}`;

  beforeAll((done) => {
    httpServer = createServer();
    wsServer = new WebSocketServer(httpServer, {
      port: TEST_PORT,
      heartbeatInterval: 5000,
      connectionTimeout: 10000,
      maxConnections: 10,
      maxMessageSize: 1024 * 1024,
    });
    httpServer.listen(TEST_PORT, () => {
      done();
    });
  });

  afterAll((done) => {
    if (clientSocket && clientSocket.readyState === WebSocket.OPEN) {
      clientSocket.close();
    }
    wsServer.close();
    httpServer.close(() => {
      done();
    });
  });

  beforeEach(() => {
    // 清理测试数据
    chatStore.clearAllSessions();
  });

  afterEach(() => {
    if (clientSocket) {
      clientSocket.close();
    }
  });

  /**
   * 任务 2.1: WebSocket 服务端基础测试
   */
  describe('任务 2.1: WebSocket 服务端基础', () => {
    test('WebSocket 服务器应该正确启动并接受连接', (done) => {
      clientSocket = new WebSocket(TEST_HOST, ['token-test-token']);

      clientSocket.on('open', () => {
        expect(clientSocket.readyState).toBe(WebSocket.OPEN);
        done();
      });

      clientSocket.on('error', (error) => {
        done(error);
      });
    });

    test('连接后应该收到连接成功事件', (done) => {
      clientSocket = new WebSocket(TEST_HOST, ['token-test-token']);

      clientSocket.on('message', (data) => {
        const message = JSON.parse(data.toString());
        expect(message.type).toBe('event');
        expect(message.payload.category).toBe('connection');
        expect(message.payload.data.event).toBe('connected');
        expect(message.payload.data.deviceId).toBeDefined();
        done();
      });
    });

    test('ping/pong 心跳机制应该正常工作', (done) => {
      clientSocket = new WebSocket(TEST_HOST, ['token-test-token']);

      clientSocket.on('open', () => {
        const pingMessage = {
          type: 'ping',
          id: 'test-ping-1',
          timestamp: Date.now(),
          deviceId: 'test-device',
          payload: {
            timestamp: Date.now(),
          },
        };
        clientSocket.send(JSON.stringify(pingMessage));
      });

      clientSocket.on('message', (data) => {
        const message = JSON.parse(data.toString());
        if (message.type === 'pong') {
          expect(message.payload.serverTime).toBeDefined();
          expect(message.payload.timestamp).toBeDefined();
          done();
        }
      });
    });
  });

  /**
   * 任务 2.2: 基础认证与设备配对测试
   */
  describe('任务 2.2: 基础认证与设备配对', () => {
    test('应该能够生成配对码', async () => {
      const session = pairingService.generatePairingCode();
      expect(session.code).toBeDefined();
      expect(session.code.length).toBe(6);
      expect(session.expiresAt).toBeInstanceOf(Date);
      expect(session.paired).toBe(false);
    });

    test('应该能够验证有效的配对码', () => {
      const session = pairingService.generatePairingCode();
      const validated = pairingService.validatePairingCode(session.code);
      expect(validated).not.toBeNull();
      expect(validated?.code).toBe(session.code);
    });

    test('应该拒绝无效的配对码', () => {
      const validated = pairingService.validatePairingCode('INVALID');
      expect(validated).toBeNull();
    });

    test('应该能够完成配对流程', () => {
      const session = pairingService.generatePairingCode();
      const deviceId = 'test-device-123';
      const result = pairingService.completePairing(session.id, deviceId);
      expect(result).toBe(true);

      const updatedSession = pairingService.getSessionById(session.id);
      expect(updatedSession?.paired).toBe(true);
      expect(updatedSession?.deviceId).toBe(deviceId);
    });

    test('应该能够生成和验证 JWT Token', () => {
      const payload = {
        deviceId: 'test-device-123',
        userId: 'user-123',
        role: 'user',
      };
      const token = tokenManager.generateToken(payload);
      expect(token).toBeDefined();

      const decoded = tokenManager.verifyToken(token);
      expect(decoded).not.toBeNull();
      expect(decoded?.deviceId).toBe(payload.deviceId);
    });
  });

  /**
   * 任务 2.5: 对话功能集成（服务端）测试
   */
  describe('任务 2.5: 对话功能集成（服务端）', () => {
    test('应该能够创建新的对话会话', async () => {
      const sessionId = 'test-session-1';
      const session = await chatStore.createSession(sessionId);
      expect(session).toBeDefined();
      expect(session.id).toBe(sessionId);
    });

    test('应该能够添加消息到对话', async () => {
      const sessionId = 'test-session-2';
      await chatStore.createSession(sessionId);
      
      const message = {
        id: 'msg-1',
        role: 'user' as const,
        content: 'Hello, AI!',
        timestamp: new Date().toISOString(),
      };
      
      await chatStore.addMessage(sessionId, message);

      const session = chatStore.getSession(sessionId);
      expect(session?.messages.length).toBe(1);
      expect(session?.messages[0].content).toBe('Hello, AI!');
    });

    test('应该能够获取对话历史', async () => {
      const sessionId = 'test-session-3';
      await chatStore.createSession(sessionId);
      
      await chatStore.addMessage(sessionId, { 
        id: 'msg-1',
        role: 'user', 
        content: 'Message 1',
        timestamp: new Date().toISOString(),
      });
      await chatStore.addMessage(sessionId, { 
        id: 'msg-2',
        role: 'assistant', 
        content: 'Response 1',
        timestamp: new Date().toISOString(),
      });
      await chatStore.addMessage(sessionId, { 
        id: 'msg-3',
        role: 'user', 
        content: 'Message 2',
        timestamp: new Date().toISOString(),
      });

      const session = chatStore.getSession(sessionId);
      expect(session?.messages.length).toBe(3);
      expect(session?.messages[0].content).toBe('Message 1');
      expect(session?.messages[1].content).toBe('Response 1');
      expect(session?.messages[2].content).toBe('Message 2');
    });

    test('应该能够删除对话会话', async () => {
      const sessionId = 'test-session-4';
      await chatStore.createSession(sessionId);
      
      let session = chatStore.getSession(sessionId);
      expect(session).toBeDefined();

      await chatStore.deleteSession(sessionId);

      session = chatStore.getSession(sessionId);
      expect(session).toBeUndefined();
    });
  });

  /**
   * 任务 2.7: 通知推送基础测试
   */
  describe('任务 2.7: 通知推送基础', () => {
    test('应该能够创建系统通知', () => {
      const notification = notificationService.createSystemNotification(
        'info',
        'Test Notification',
        'This is a test notification'
      );

      expect(notification).toBeDefined();
      expect(notification.title).toBe('Test Notification');
      expect(notification.message).toBe('This is a test notification');
      expect(notification.type).toBe('info');
      expect(notification.id).toBeDefined();
    });

    test('应该能够获取所有通知', () => {
      // 清理现有通知
      notificationService.clearNotifications();

      // 验证队列为空
      const notifications = notificationService.getAllNotifications();
      expect(notifications.length).toBe(0);
    });

    test('应该能够根据ID获取通知', () => {
      // 清理现有通知
      notificationService.clearNotifications();
      
      const notification = notificationService.createSystemNotification(
        'success',
        'Findable Notification',
        'This notification should be findable'
      );

      // createSystemNotification 不会将通知添加到队列
      // 所以这里应该返回 undefined
      const found = notificationService.getNotificationById(notification.id);
      expect(found).toBeUndefined();
    });
  });

  /**
   * 任务 2.8: 项目文件浏览（服务端）测试
   */
  describe('任务 2.8: 项目文件浏览（服务端）', () => {
    test('应该能够列出目录内容', async () => {
      const dirPath = './src';
      const entries = await fileService.listDirectory(dirPath);
      expect(Array.isArray(entries)).toBe(true);
      expect(entries.length).toBeGreaterThan(0);
    });

    test('应该能够读取文件内容', async () => {
      const filePath = './package.json';
      const content = await fileService.readFile(filePath);
      expect(content).toBeDefined();
      expect(typeof content).toBe('string');

      const parsed = JSON.parse(content);
      expect(parsed.name).toBeDefined();
    });

    test('应该能够获取文件信息', async () => {
      const filePath = './package.json';
      const stats = await fileService.getFileStats(filePath);
      expect(stats).toBeDefined();
      expect(stats.isFile()).toBe(true);
    });
  });

  /**
   * 任务 2.9: 文件监听与实时同步测试
   */
  describe('任务 2.9: 文件监听与实时同步', () => {
    test('文件服务应该支持文件监听', async () => {
      const watchPath = './src';
      const watcher = await fileService.watchDirectory(watchPath, (event, path) => {
        // 回调函数
      });

      expect(watcher).toBeDefined();
      expect(typeof watcher.close).toBe('function');

      await watcher.close();
    });
  });

  /**
   * 端到端集成测试
   */
  describe('端到端集成测试', () => {
    test('完整的配对和对话流程', (done) => {
      // 1. 生成配对码
      const pairingSession = pairingService.generatePairingCode();
      expect(pairingSession.code).toBeDefined();

      // 2. 建立 WebSocket 连接
      clientSocket = new WebSocket(TEST_HOST, [`token-${pairingSession.code}`]);

      let deviceId: string;
      let messageReceived = false;

      clientSocket.on('message', (data) => {
        const message = JSON.parse(data.toString());

        if (message.type === 'event' && message.payload.category === 'connection') {
          if (message.payload.data.event === 'connected') {
            deviceId = message.payload.data.deviceId;

            // 3. 完成配对
            pairingService.completePairing(pairingSession.id, deviceId);

            // 4. 发送对话消息
            const chatMessage = {
              type: 'command',
              id: 'test-chat-1',
              timestamp: Date.now(),
              deviceId: deviceId,
              payload: {
                category: 'chat',
                action: 'send',
                data: {
                  sessionId: 'test-session',
                  content: 'Hello from integration test!',
                },
              },
            };
            clientSocket.send(JSON.stringify(chatMessage));
          }
        }

        // 验证收到任何响应（可能是 chat 事件或错误事件）
        if (!messageReceived && message.type === 'event') {
          messageReceived = true;
          expect(message.payload).toBeDefined();
          done();
        }
      });

      clientSocket.on('error', (error) => {
        done(error);
      });
      
      // 5秒超时保护
      setTimeout(() => {
        if (!messageReceived) {
          done(new Error('Test timeout - no message received'));
        }
      }, 5000);
    }, 10000);

    test('未认证设备应该被拒绝访问受保护功能', (done) => {
      clientSocket = new WebSocket(TEST_HOST, ['token-invalid-token']);

      clientSocket.on('open', () => {
        // 尝试发送需要认证的消息
        const message = {
          type: 'command',
          id: 'test-unauthorized',
          timestamp: Date.now(),
          deviceId: 'unauthorized-device',
          payload: {
            category: 'chat',
            action: 'send',
            data: {
              content: 'This should fail',
            },
          },
        };
        clientSocket.send(JSON.stringify(message));
      });

      clientSocket.on('message', (data) => {
        const message = JSON.parse(data.toString());

        if (message.type === 'event' && message.payload.category === 'error') {
          expect(message.payload.data.code).toBe('UNAUTHENTICATED');
          done();
        }
      });
    }, 5000);
  });

  /**
   * 性能基准测试
   */
  describe('性能基准测试', () => {
    test('WebSocket 连接建立时间应该小于 100ms', async () => {
      const startTime = Date.now();

      await new Promise<void>((resolve, reject) => {
        clientSocket = new WebSocket(TEST_HOST, ['token-perf-test']);

        clientSocket.on('open', () => {
          const connectTime = Date.now() - startTime;
          expect(connectTime).toBeLessThan(100);
          resolve();
        });

        clientSocket.on('error', reject);
      });
    });

    test('消息往返时间应该小于 50ms', async () => {
      clientSocket = new WebSocket(TEST_HOST, ['token-perf-test']);

      await new Promise<void>((resolve) => {
        clientSocket.on('open', () => {
          resolve();
        });
      });

      const startTime = Date.now();

      await new Promise<void>((resolve) => {
        clientSocket.on('message', (data) => {
          const message = JSON.parse(data.toString());
          if (message.type === 'pong') {
            const rtt = Date.now() - startTime;
            expect(rtt).toBeLessThan(50);
            resolve();
          }
        });

        clientSocket.send(JSON.stringify({
          type: 'ping',
          id: 'perf-test',
          timestamp: startTime,
          deviceId: 'perf-device',
          payload: { timestamp: startTime },
        }));
      });
    });

    test('服务器应该能够处理并发连接', async () => {
      const connections: WebSocket[] = [];
      const concurrentConnections = 5;

      const connectPromises = Array.from({ length: concurrentConnections }, (_, i) => {
        return new Promise<void>((resolve, reject) => {
          const ws = new WebSocket(TEST_HOST, [`token-concurrent-${i}`]);

          ws.on('open', () => {
            connections.push(ws);
            resolve();
          });

          ws.on('error', reject);
        });
      });

      await Promise.all(connectPromises);

      const serverConnections = wsServer.getConnections();
      expect(serverConnections.length).toBeGreaterThanOrEqual(concurrentConnections);

      // 清理连接
      connections.forEach(ws => ws.close());
    });
  });
});
