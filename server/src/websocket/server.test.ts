import * as http from 'http';
import WebSocket from 'ws';
import { WebSocketServer } from './server';
import { WebSocketMessage } from '../models/types';
import { logger } from '../utils/logger';

describe('WebSocketServer', () => {
  let httpServer: http.Server;
  let wsServer: WebSocketServer;
  let client: WebSocket;
  let deviceId: string;

  beforeAll((done) => {
    httpServer = http.createServer();
    wsServer = new WebSocketServer(httpServer, {
      heartbeatInterval: 1000,
      connectionTimeout: 2000,
      maxConnections: 5,
      maxMessageSize: 1024, // 1KB for testing
    });

    httpServer.listen(8080, () => {
      done();
    });
  });

  afterAll((done) => {
    if (client && client.readyState === WebSocket.OPEN) {
      client.close();
    }
    wsServer.close();
    httpServer.close(done);
  });

  it('should accept WebSocket connections', (done) => {
    client = new WebSocket('ws://localhost:8080');

    client.on('open', () => {
      const connections = wsServer.getConnections();
      expect(connections.length).toBe(1);
      deviceId = connections[0].deviceId;
      done();
    });

    client.on('error', (error) => {
      done.fail(error);
    });
  });

  it('should store clientIp correctly', (done) => {
    setTimeout(() => {
      const connections = wsServer.getConnections();
      const connection = connections.find(c => c.deviceId === deviceId);
      expect(connection).toBeDefined();
      expect(connection?.clientIp).toBeDefined();
      // Client IP should be localhost or 127.0.0.1
      expect(connection?.clientIp).toMatch(/(localhost|127\.0\.0\.1)/);
      done();
    }, 100);
  });

  it('should send connected event on connection', (done) => {
    client.on('message', (data) => {
      const message: WebSocketMessage = JSON.parse(data.toString());
      expect(message.type).toBe('event');
      const eventPayload = message.payload as any;
      expect(eventPayload.category).toBe('connection');
      expect(eventPayload.data.event).toBe('connected');
      done();
    });
  });

  it('should respond to ping messages', (done) => {
    const pingMessage: WebSocketMessage = {
      type: 'ping',
      id: 'test-ping',
      timestamp: Date.now(),
      deviceId: 'test-device',
      payload: {
        timestamp: Date.now(),
      },
    };

    client.once('message', (data) => {
      const message: WebSocketMessage = JSON.parse(data.toString());
      expect(message.type).toBe('pong');
      const pongPayload = message.payload as any;
      expect(pongPayload.serverTime).toBeDefined();
      done();
    });

    client.send(JSON.stringify(pingMessage));
  });

  it('should close connection for messages exceeding maxMessageSize', (done) => {
    // Create a large message exceeding 1KB
    const largeMessage: WebSocketMessage = {
      type: 'event',
      id: 'large-message',
      timestamp: Date.now(),
      deviceId: 'test-device',
      payload: {
        category: 'test',
        data: {
          message: 'a'.repeat(2048), // 2KB message
        },
      },
    };

    client.on('close', (code) => {
      expect(code).toBe(4002); // MESSAGE_TOO_LARGE
      done();
    });

    client.send(JSON.stringify(largeMessage));
  });

  it('should handle max connections', (done) => {
    const clients: WebSocket[] = [];
    let connectedCount = 0;
    const maxConnections = 5;

    const connectClient = (index: number) => {
      const newClient = new WebSocket('ws://localhost:8080');
      
      newClient.on('open', () => {
        connectedCount++;
        clients.push(newClient);
        
        if (index < maxConnections - 1) {
          connectClient(index + 1);
        } else {
          setTimeout(() => {
            const connections = wsServer.getConnections();
            expect(connections.length).toBe(maxConnections);
            
            // Try to connect one more client
            const extraClient = new WebSocket('ws://localhost:8080');
            extraClient.on('close', (code) => {
              expect(code).toBe(4000);
              
              // Clean up
              clients.forEach(c => c.close());
              done();
            });
          }, 100);
        }
      });

      newClient.on('error', () => {
        // Ignore errors for this test
      });
    };

    connectClient(0);
  });

  it('should timeout inactive connections', (done) => {
    const testClient = new WebSocket('ws://localhost:8080');
    let testDeviceId: string;

    testClient.on('open', () => {
      const connections = wsServer.getConnections();
      testDeviceId = connections.find(c => c.deviceId !== deviceId)?.deviceId!;
      expect(testDeviceId).toBeDefined();

      // Wait for timeout
      setTimeout(() => {
        const connectionsAfterTimeout = wsServer.getConnections();
        const hasTestConnection = connectionsAfterTimeout.some(c => c.deviceId === testDeviceId);
        expect(hasTestConnection).toBe(false);
        done();
      }, 3000);
    });

    testClient.on('error', (error) => {
      done.fail(error);
    });
  });

  it('should send messages to specific devices', (done) => {
    // Reconnect client since it was closed in the maxMessageSize test
    client = new WebSocket('ws://localhost:8080');

    client.on('open', () => {
      const connections = wsServer.getConnections();
      deviceId = connections[connections.length - 1].deviceId;

      const testMessage: WebSocketMessage = {
        type: 'event',
        id: 'test-message',
        timestamp: Date.now(),
        deviceId: 'server',
        payload: {
          category: 'test',
          data: {
            message: 'Hello from server',
          },
        },
      };

      client.once('message', (data) => {
        const message: WebSocketMessage = JSON.parse(data.toString());
        expect(message.type).toBe('event');
        const eventPayload = message.payload as any;
        expect(eventPayload.category).toBe('test');
        expect(eventPayload.data.message).toBe('Hello from server');
        done();
      });

      const result = wsServer.sendToDevice(deviceId, testMessage);
      expect(result).toBe(true);
    });

    client.on('error', (error) => {
      done.fail(error);
    });
  });

  it('should broadcast messages to all devices', (done) => {
    const broadcastMessage: WebSocketMessage = {
      type: 'event',
      id: 'broadcast-message',
      timestamp: Date.now(),
      deviceId: 'server',
      payload: {
        category: 'broadcast',
        data: {
          message: 'Hello to all',
        },
      },
    };

    let messageReceived = false;

    client.once('message', (data) => {
      const message: WebSocketMessage = JSON.parse(data.toString());
      expect(message.type).toBe('event');
      const eventPayload = message.payload as any;
      expect(eventPayload.category).toBe('broadcast');
      expect(eventPayload.data.message).toBe('Hello to all');
      messageReceived = true;
    });

    wsServer.broadcast(broadcastMessage);

    setTimeout(() => {
      expect(messageReceived).toBe(true);
      done();
    }, 100);
  });

  it('should exclude specific device from broadcast', (done) => {
    const broadcastMessage: WebSocketMessage = {
      type: 'event',
      id: 'broadcast-exclude',
      timestamp: Date.now(),
      deviceId: 'server',
      payload: {
        category: 'broadcast',
        data: {
          message: 'Hello to others',
        },
      },
    };

    let messageReceived = false;

    client.on('message', (data) => {
      const message: WebSocketMessage = JSON.parse(data.toString());
      if (message.id === 'broadcast-exclude') {
        messageReceived = true;
      }
    });

    wsServer.broadcast(broadcastMessage, deviceId);

    setTimeout(() => {
      expect(messageReceived).toBe(false);
      done();
    }, 100);
  });

  it('should handle connection closure', (done) => {
    const testClient = new WebSocket('ws://localhost:8080');
    let testDeviceId: string;

    testClient.on('open', () => {
      const connections = wsServer.getConnections();
      testDeviceId = connections.find(c => c.deviceId !== deviceId)?.deviceId!;
      expect(testDeviceId).toBeDefined();

      testClient.close();

      setTimeout(() => {
        const connectionsAfterClose = wsServer.getConnections();
        const hasTestConnection = connectionsAfterClose.some(c => c.deviceId === testDeviceId);
        expect(hasTestConnection).toBe(false);
        done();
      }, 100);
    });

    testClient.on('error', (error) => {
      done.fail(error);
    });
  });

  it('should handle authentication and update isAuthenticated status', (done) => {
    // Generate pairing code first
    const generatePairingCodeMessage: WebSocketMessage = {
      type: 'command',
      id: 'generate-pairing-code',
      timestamp: Date.now(),
      deviceId: deviceId,
      payload: {
        category: 'auth',
        action: 'generate_pairing_code',
        data: {},
      },
    };

    client.once('message', (data) => {
      const message: WebSocketMessage = JSON.parse(data.toString());
      expect(message.type).toBe('event');
      const eventPayload = message.payload as any;
      expect(eventPayload.category).toBe('auth');
      expect(eventPayload.data.action).toBe('generate_pairing_code');
      expect(eventPayload.data.success).toBe(true);
      expect(eventPayload.data.pairingCode).toBeDefined();

      const pairingCode = eventPayload.data.pairingCode;

      // Now use the pairing code to authenticate
      const pairMessage: WebSocketMessage = {
        type: 'command',
        id: 'pair-device',
        timestamp: Date.now(),
        deviceId: deviceId,
        payload: {
          category: 'auth',
          action: 'pair',
          data: {
            pairingCode,
          },
        },
      };

      client.once('message', (data) => {
        const message: WebSocketMessage = JSON.parse(data.toString());
        expect(message.type).toBe('event');
        const eventPayload = message.payload as any;
        expect(eventPayload.category).toBe('auth');
        expect(eventPayload.data.action).toBe('pair');
        expect(eventPayload.data.success).toBe(true);
        expect(eventPayload.data.token).toBeDefined();

        // Check if device is now authenticated
        const connections = wsServer.getConnections();
        const connection = connections.find(c => c.deviceId === deviceId);
        expect(connection).toBeDefined();
        expect(connection?.isAuthenticated).toBe(true);

        done();
      });

      client.send(JSON.stringify(pairMessage));
    });

    client.send(JSON.stringify(generatePairingCodeMessage));
  });
});
