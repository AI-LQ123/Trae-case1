import * as http from 'http';
import WebSocket from 'ws';
import { WebSocketServer } from './server';
import { WebSocketMessage } from '../models/types';
import { logger } from '../utils/logger';

describe('WebSocketServer', () => {
  let httpServer: http.Server;
  let wsServer: WebSocketServer;

  beforeAll((done) => {
    httpServer = http.createServer();
    wsServer = new WebSocketServer(httpServer, {
      heartbeatInterval: 1000,
      connectionTimeout: 5000,
      maxConnections: 5,
      maxMessageSize: 1024,
      requireAuth: false,
    });

    httpServer.listen(8080, () => {
      done();
    });
  });

  afterAll((done) => {
    if (wsServer) {
      wsServer.close();
    }
    httpServer.close(done);
  });

  const createClient = (): Promise<{ client: WebSocket; deviceId: string }> => {
    return new Promise((resolve, reject) => {
      const client = new WebSocket('ws://localhost:8080');
      let deviceId: string;
      let connectedEventReceived = false;

      const timeout = setTimeout(() => {
        reject(new Error('Connection timeout'));
      }, 5000);

      client.on('open', () => {
        const connections = wsServer.getConnections();
        deviceId = connections[connections.length - 1].deviceId;
      });

      client.on('message', (data) => {
        const message: WebSocketMessage = JSON.parse(data.toString());
        const payload = message.payload as any;
        if (payload?.category === 'connection' && !connectedEventReceived) {
          connectedEventReceived = true;
          clearTimeout(timeout);
          resolve({ client, deviceId });
        }
      });

      client.on('error', (error) => {
        clearTimeout(timeout);
        reject(error);
      });
    });
  };

  const closeClient = (client: WebSocket): Promise<void> => {
    return new Promise((resolve) => {
      if (client.readyState === WebSocket.OPEN) {
        client.on('close', () => resolve());
        client.close();
      } else {
        resolve();
      }
    });
  };

  it('should accept WebSocket connections', async () => {
    const { client, deviceId } = await createClient();
    expect(deviceId).toBeDefined();
    await closeClient(client);
  });

  it('should store clientIp correctly', async () => {
    const { client, deviceId } = await createClient();
    const connections = wsServer.getConnections();
    const connection = connections.find(c => c.deviceId === deviceId);
    expect(connection).toBeDefined();
    expect(connection?.clientIp).toBeDefined();
    expect(connection?.clientIp).toMatch(/(localhost|127\.0\.0\.1|::1)/);
    await closeClient(client);
  });

  it('should send connected event on connection', async () => {
    const { client } = await createClient();
    await closeClient(client);
  });

  it('should respond to ping messages', async () => {
    const { client, deviceId } = await createClient();
    
    const pingMessage: WebSocketMessage = {
      type: 'ping',
      id: 'test-ping',
      timestamp: Date.now(),
      deviceId: deviceId,
      payload: {
        timestamp: Date.now(),
      },
    };

    const pongPromise = new Promise((resolve) => {
      client.once('message', (data) => {
        const message: WebSocketMessage = JSON.parse(data.toString());
        expect(message.type).toBe('pong');
        const pongPayload = message.payload as any;
        expect(pongPayload.serverTime).toBeDefined();
        resolve(true);
      });
    });

    client.send(JSON.stringify(pingMessage));
    await pongPromise;
    await closeClient(client);
  });

  it('should close connection for messages exceeding maxMessageSize', async () => {
    const { client } = await createClient();
    
    const largeMessage: WebSocketMessage = {
      type: 'event',
      id: 'large-message',
      timestamp: Date.now(),
      deviceId: 'test-device',
      payload: {
        category: 'test',
        data: {
          message: 'a'.repeat(2048),
        },
      },
    };

    const closePromise = new Promise((resolve) => {
      client.on('close', (code) => {
        expect(code).toBe(4002);
        resolve(true);
      });
    });

    client.send(JSON.stringify(largeMessage));
    await closePromise;
  });

  it('should handle max connections', async () => {
    const clients: WebSocket[] = [];
    const maxConnections = 5;

    for (let i = 0; i < maxConnections; i++) {
      const { client } = await createClient();
      clients.push(client);
    }

    const connections = wsServer.getConnections();
    expect(connections.length).toBe(maxConnections);

    const extraClient = new WebSocket('ws://localhost:8080');
    const closePromise = new Promise((resolve) => {
      extraClient.on('close', (code) => {
        expect(code).toBe(4000);
        resolve(true);
      });
    });

    await closePromise;

    for (const c of clients) {
      await closeClient(c);
    }
  });

  it('should timeout inactive connections', async () => {
    const { client, deviceId } = await createClient();
    
    await new Promise((resolve) => setTimeout(resolve, 6000));
    
    const connectionsAfterTimeout = wsServer.getConnections();
    const hasTestConnection = connectionsAfterTimeout.some(c => c.deviceId === deviceId);
    expect(hasTestConnection).toBe(false);
    
    await closeClient(client);
  }, 15000);

  it('should send messages to specific devices', async () => {
    const { client, deviceId } = await createClient();
    
    const messagePromise = new Promise((resolve) => {
      client.on('message', (data) => {
        const message = JSON.parse(data.toString());
        const payload = message.payload as any;
        if (payload?.category === 'connection') {
          return;
        }
        expect(payload.category).toBe('test');
        expect(payload.data.message).toBe('Hello from server');
        resolve(true);
      });
    });

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

    wsServer.sendToDevice(deviceId, testMessage);
    await messagePromise;
    await closeClient(client);
  });

  it('should broadcast messages to all devices', async () => {
    const { client, deviceId } = await createClient();
    
    let messageReceived = false;
    const messagePromise = new Promise((resolve) => {
      client.on('message', (data) => {
        const message: WebSocketMessage = JSON.parse(data.toString());
        const payload = message.payload as any;
        if (payload?.category === 'connection') {
          return;
        }
        expect(message.type).toBe('event');
        expect(payload.category).toBe('broadcast');
        expect(payload.data.message).toBe('Hello to all');
        messageReceived = true;
        resolve(true);
      });
    });

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

    wsServer.broadcast(broadcastMessage);
    await messagePromise;
    expect(messageReceived).toBe(true);
    await closeClient(client);
  });

  it('should exclude specific device from broadcast', async () => {
    const { client, deviceId } = await createClient();
    
    let messageReceived = false;
    client.on('message', (data) => {
      const message: WebSocketMessage = JSON.parse(data.toString());
      if (message.id === 'broadcast-exclude') {
        messageReceived = true;
      }
    });

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

    wsServer.broadcast(broadcastMessage, deviceId);
    
    await new Promise((resolve) => setTimeout(resolve, 200));
    expect(messageReceived).toBe(false);
    await closeClient(client);
  });

  it('should handle connection closure', async () => {
    const { client, deviceId } = await createClient();
    
    await closeClient(client);
    
    await new Promise((resolve) => setTimeout(resolve, 200));
    
    const connectionsAfterClose = wsServer.getConnections();
    const hasTestConnection = connectionsAfterClose.some(c => c.deviceId === deviceId);
    expect(hasTestConnection).toBe(false);
  });

  it('should handle authentication and update isAuthenticated status', async () => {
    const { client, deviceId } = await createClient();
    
    let pairingCode: string;
    let token: string;

    const messageHandler = (data: WebSocket.Data) => {
      const message: WebSocketMessage = JSON.parse(data.toString());
      const payload = message.payload as any;
      
      if (payload?.category === 'connection') {
        return;
      }

      if (payload?.data?.action === 'generate_pairing_code') {
        expect(message.type).toBe('event');
        expect(payload.category).toBe('auth');
        expect(payload.data.action).toBe('generate_pairing_code');
        expect(payload.data.success).toBe(true);
        expect(payload.data.pairingCode).toBeDefined();
        pairingCode = payload.data.pairingCode;

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

        client.send(JSON.stringify(pairMessage));
      }

      if (payload?.data?.action === 'pair') {
        expect(message.type).toBe('event');
        expect(payload.category).toBe('auth');
        expect(payload.data.action).toBe('pair');
        expect(payload.data.success).toBe(true);
        expect(payload.data.token).toBeDefined();
        token = payload.data.token;

        const connections = wsServer.getConnections();
        const connection = connections.find(c => c.deviceId === deviceId);
        expect(connection).toBeDefined();
        expect(connection?.isAuthenticated).toBe(true);
      }
    };

    client.on('message', messageHandler);

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

    client.send(JSON.stringify(generatePairingCodeMessage));
    
    await new Promise((resolve) => setTimeout(resolve, 1000));
    await closeClient(client);
  });
});
