import WebSocket from 'ws';
import { Connection } from '../models/types';

export class ConnectionManager {
  private connections: Map<string, Connection> = new Map();

  addConnection(deviceId: string, ws: WebSocket): Connection {
    const connection: Connection = {
      deviceId,
      ws,
      connectedAt: Date.now(),
      lastPing: Date.now(),
      isAuthenticated: false,
    };

    this.connections.set(deviceId, connection);
    return connection;
  }

  removeConnection(deviceId: string): boolean {
    return this.connections.delete(deviceId);
  }

  getConnection(deviceId: string): Connection | undefined {
    return this.connections.get(deviceId);
  }

  getAllConnections(): Connection[] {
    return Array.from(this.connections.values());
  }

  getAuthenticatedConnections(): Connection[] {
    return Array.from(this.connections.values()).filter(conn => conn.isAuthenticated);
  }

  updateLastPing(deviceId: string): boolean {
    const connection = this.connections.get(deviceId);
    if (connection) {
      connection.lastPing = Date.now();
      return true;
    }
    return false;
  }

  setAuthenticated(deviceId: string, isAuthenticated: boolean): boolean {
    const connection = this.connections.get(deviceId);
    if (connection) {
      connection.isAuthenticated = isAuthenticated;
      return true;
    }
    return false;
  }

  checkConnections(timeout: number = 60000): string[] {
    const now = Date.now();
    const disconnectedDevices: string[] = [];

    for (const [deviceId, connection] of this.connections.entries()) {
      if (now - connection.lastPing > timeout) {
        disconnectedDevices.push(deviceId);
      }
    }

    return disconnectedDevices;
  }

  clear(): void {
    this.connections.clear();
  }

  size(): number {
    return this.connections.size;
  }
}
