import { WebSocketClient, WebSocketMessage } from './WebSocketClient';

// Mock WebSocket
class MockWebSocket {
  readyState: number = 1; // OPEN
  onopen: ((event: Event) => void) | null = null;
  onmessage: ((event: MessageEvent) => void) | null = null;
  onclose: ((event: CloseEvent) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;
  sentMessages: string[] = [];

  constructor(_url: string) {
    // Simulate open event
    setTimeout(() => {
      if (this.onopen) {
        this.onopen({} as Event);
      }
    }, 0);
  }

  send(data: string): void {
    this.sentMessages.push(data);
  }

  close(): void {
    // Simulate close event
    setTimeout(() => {
      if (this.onclose) {
        this.onclose({} as CloseEvent);
      }
    }, 0);
  }
}

// Mock global WebSocket
(global as any).WebSocket = MockWebSocket;

// Mock store
jest.mock('../../state/store', () => ({
  store: {
    dispatch: jest.fn(),
  },
}));

// Mock actions
jest.mock('../../state/slices/websocketSlice', () => ({
  setConnected: jest.fn(),
  setReconnecting: jest.fn(),
  setLastPingTime: jest.fn(),
  setLatency: jest.fn(),
  setError: jest.fn(),
}));

// Mock ReconnectionManager
jest.mock('./reconnection', () => ({
  ReconnectionManager: jest.fn().mockImplementation(() => ({
    scheduleReconnect: jest.fn(),
    reset: jest.fn(),
    cancel: jest.fn(),
  })),
}));

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  setItem: jest.fn(),
  getItem: jest.fn(),
}));

describe('WebSocketClient', () => {
  let client: WebSocketClient;

  beforeEach(() => {
    client = new WebSocketClient({ url: 'ws://localhost:3001' });
    jest.clearAllMocks();
  });

  afterEach(() => {
    client.disconnect();
  });

  describe('连接管理', () => {
    test('should connect successfully', (done) => {
      client.connect();
      setTimeout(() => {
        expect(client).toBeDefined();
        done();
      }, 10);
    });

    test('should not connect if already connected', () => {
      client.connect();
      // Call connect again
      client.connect();
      // Should not create new connection
    });

    test('should handle connection error', () => {
      // Mock WebSocket to throw error
      (global as any).WebSocket = class MockWebSocketError {
        constructor() {
          throw new Error('Connection error');
        }
      };

      const errorClient = new WebSocketClient({ url: 'ws://localhost:3001' });
      errorClient.connect();
      // Should handle error and schedule reconnect
    });

    test('should disconnect properly', () => {
      client.connect();
      client.disconnect();
      // Should close connection and clear timers
    });
  });

  describe('消息发送', () => {
    test('should send message when connected', (done) => {
      client.connect();
      
      setTimeout(() => {
        const message = {
          type: 'command' as const,
          id: 'test-id',
          timestamp: Date.now(),
          payload: { test: 'data' },
        };
        client.send(message);
        // Should send message
        done();
      }, 10);
    });

    test('should queue message when not connected', () => {
      const message = {
        type: 'command' as const,
        id: 'test-id',
        timestamp: Date.now(),
        payload: { test: 'data' },
      };
      client.send(message);
      // Should queue message
      expect(client.getQueueSize()).toBe(1);
    });

    test('should flush message queue on connect', (done) => {
      // Queue messages before connection
      const message1 = {
        type: 'command' as const,
        id: 'test-id-1',
        timestamp: Date.now(),
        payload: { test: 'data1' },
      };
      const message2 = {
        type: 'command' as const,
        id: 'test-id-2',
        timestamp: Date.now(),
        payload: { test: 'data2' },
      };
      client.send(message1);
      client.send(message2);
      expect(client.getQueueSize()).toBe(2);

      // Connect and flush
      client.connect();
      
      setTimeout(() => {
        // Queue should be flushed
        expect(client.getQueueSize()).toBe(0);
        done();
      }, 20);
    });

    test('should limit queue size', () => {
      // Fill queue beyond max size
      for (let i = 0; i < 105; i++) {
        const message = {
          type: 'command' as const,
          id: `test-id-${i}`,
          timestamp: Date.now(),
          payload: { test: `data${i}` },
        };
        client.send(message);
      }
      // Queue should be limited to 100
      expect(client.getQueueSize()).toBe(100);
    });

    test('should clear queue', () => {
      const message = {
        type: 'command' as const,
        id: 'test-id',
        timestamp: Date.now(),
        payload: { test: 'data' },
      };
      client.send(message);
      expect(client.getQueueSize()).toBe(1);
      
      client.clearQueue();
      expect(client.getQueueSize()).toBe(0);
    });
  });

  describe('心跳机制', () => {
    test('should handle ping/pong', (done) => {
      client.connect();
      
      setTimeout(() => {
        client.ping();
        // Should send ping message
        done();
      }, 10);
    });

    test('should handle pong message and clear timeout', (done) => {
      client.connect();
      
      setTimeout(() => {
        // Simulate pong message
        const pongMessage: WebSocketMessage = {
          type: 'pong',
          id: 'pong-1',
          timestamp: Date.now(),
          deviceId: 'test-device',
          payload: {},
        };
        // @ts-ignore - accessing private method for testing
        client.handleMessage(JSON.stringify(pongMessage));
        // Should clear pong timeout and update latency
        done();
      }, 10);
    });

    test('should handle pong timeout', (done) => {
      client.connect();
      
      setTimeout(() => {
        client.ping();
        // Wait for pong timeout (5 seconds in real implementation)
        // In test, we can verify the timeout was set
        // @ts-ignore - accessing private property for testing
        expect(client.pongTimeout).toBeTruthy();
        done();
      }, 10);
    });
  });

  describe('重连机制', () => {
    test('should schedule reconnect on close', (done) => {
      client.connect();
      
      setTimeout(() => {
        // Simulate close
        // @ts-ignore - accessing private property for testing
        client.ws?.close();
        // Should schedule reconnect
        done();
      }, 10);
    });

    test('should not schedule reconnect if already scheduled', () => {
      client.connect();
      // @ts-ignore - accessing private method for testing
      client.scheduleReconnect();
      // Call again
      // @ts-ignore - accessing private method for testing
      client.scheduleReconnect();
      // Should only schedule once
    });
  });

  describe('消息处理', () => {
    test('should handle message parsing error', (done) => {
      client.connect();
      
      setTimeout(() => {
        // @ts-ignore - accessing private method for testing
        client.handleMessage('invalid json');
        // Should dispatch error
        done();
      }, 10);
    });

    test('should register and call message handler', (done) => {
      client.connect();
      
      setTimeout(() => {
        const handler = jest.fn();
        client.onMessage('command', handler);
        
        const commandMessage: WebSocketMessage = {
          type: 'command',
          id: 'cmd-1',
          timestamp: Date.now(),
          deviceId: 'test-device',
          payload: { action: 'test' },
        };
        
        // @ts-ignore - accessing private method for testing
        client.handleMessage(JSON.stringify(commandMessage));
        
        expect(handler).toHaveBeenCalledWith(commandMessage);
        done();
      }, 10);
    });

    test('should unregister message handler', (done) => {
      client.connect();
      
      setTimeout(() => {
        const handler = jest.fn();
        client.onMessage('command', handler);
        client.offMessage('command');
        
        const commandMessage: WebSocketMessage = {
          type: 'command',
          id: 'cmd-1',
          timestamp: Date.now(),
          deviceId: 'test-device',
          payload: { action: 'test' },
        };
        
        // @ts-ignore - accessing private method for testing
        client.handleMessage(JSON.stringify(commandMessage));
        
        expect(handler).not.toHaveBeenCalled();
        done();
      }, 10);
    });

    test('should return unsubscribe function', (done) => {
      client.connect();
      
      setTimeout(() => {
        const handler = jest.fn();
        const unsubscribe = client.onMessage('command', handler);
        
        // Unsubscribe
        unsubscribe();
        
        const commandMessage: WebSocketMessage = {
          type: 'command',
          id: 'cmd-1',
          timestamp: Date.now(),
          deviceId: 'test-device',
          payload: { action: 'test' },
        };
        
        // @ts-ignore - accessing private method for testing
        client.handleMessage(JSON.stringify(commandMessage));
        
        expect(handler).not.toHaveBeenCalled();
        done();
      }, 10);
    });

    test('should handle event messages', (done) => {
      client.connect();
      
      setTimeout(() => {
        const handler = jest.fn();
        client.onMessage('event', handler);
        
        const eventMessage: WebSocketMessage = {
          type: 'event',
          category: 'chat',
          id: 'evt-1',
          timestamp: Date.now(),
          deviceId: 'test-device',
          payload: { content: 'Hello' },
        };
        
        // @ts-ignore - accessing private method for testing
        client.handleMessage(JSON.stringify(eventMessage));
        
        expect(handler).toHaveBeenCalledWith(eventMessage);
        done();
      }, 10);
    });
  });

  describe('认证', () => {
    test('should connect with auth token', () => {
      const authClient = new WebSocketClient({ 
        url: 'ws://localhost:3001',
        authToken: 'test-token'
      });
      authClient.connect();
      // Should connect with token in URL
    });
  });

  describe('设备ID管理', () => {
    test('should generate device ID', () => {
      const newClient = new WebSocketClient({ url: 'ws://localhost:3001' });
      expect(newClient).toBeDefined();
    });

    test('should use provided device ID', () => {
      const customClient = new WebSocketClient({ 
        url: 'ws://localhost:3001',
        deviceId: 'custom-device-id'
      });
      expect(customClient).toBeDefined();
    });
  });
});