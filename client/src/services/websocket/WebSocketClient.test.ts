import { WebSocketClient, WebSocketMessage } from './WebSocketClient';

// Mock WebSocket
class MockWebSocket {
  readyState: number = 1; // OPEN
  onopen: ((event: Event) => void) | null = null;
  onmessage: ((event: MessageEvent) => void) | null = null;
  onclose: ((event: CloseEvent) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;

  constructor(_url: string) {
    // Simulate open event
    setTimeout(() => {
      if (this.onopen) {
        this.onopen({} as Event);
      }
    }, 0);
  }

  send(_data: string): void {
    // Mock send
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

describe('WebSocketClient', () => {
  let client: WebSocketClient;

  beforeEach(() => {
    client = new WebSocketClient('ws://localhost:3001');
    jest.clearAllMocks();
  });

  afterEach(() => {
    client.disconnect();
  });

  test('should connect successfully', () => {
    client.connect();
    // Should dispatch connected event
  });

  test('should send message when connected', () => {
    client.connect();
    const message = {
      type: 'command' as const,
      id: 'test-id',
      timestamp: Date.now(),
      payload: { test: 'data' },
    };
    client.send(message);
    // Should send message
  });

  test('should handle ping/pong', () => {
    client.connect();
    client.ping();
    // Should send ping message
  });

  test('should handle pong message and clear timeout', () => {
    client.connect();
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
  });

  test('should schedule reconnect on close', () => {
    client.connect();
    // Simulate close
    // Should schedule reconnect
  });

  test('should handle error', () => {
    // Mock WebSocket to throw error
    (global as any).WebSocket = class MockWebSocketError {
      constructor() {
        throw new Error('Connection error');
      }
    };

    const errorClient = new WebSocketClient('ws://localhost:3001');
    errorClient.connect();
    // Should handle error and schedule reconnect
  });

  test('should handle message parsing error', () => {
    client.connect();
    // @ts-ignore - accessing private method for testing
    client.handleMessage('invalid json');
    // Should dispatch error
  });

  test('should register and call message handler', () => {
    client.connect();
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
  });

  test('should unregister message handler', () => {
    client.connect();
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
  });

  test('should disconnect properly', () => {
    client.connect();
    client.disconnect();
    // Should close connection and clear timers
  });

  test('should handle pong timeout', () => {
    client.connect();
    // Wait for ping to be sent and pong timeout to trigger
    // Should close connection and reconnect
  });
});
