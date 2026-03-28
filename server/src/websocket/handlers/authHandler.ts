import { WebSocketMessage } from '../../models/types';
import { MessageHandler } from '../messageRouter';
import { WebSocketServer } from '../server';
import { logger } from '../../utils/logger';

// In-memory storage for pairing codes and tokens (replace with actual database in production)
class AuthStorage {
  private pairingCodes: Map<string, { deviceId: string; expiresAt: number }> = new Map();
  private tokens: Map<string, { deviceId: string; expiresAt: number }> = new Map();

  // Generate a pairing code
  generatePairingCode(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  // Store pairing code with device ID
  storePairingCode(pairingCode: string, deviceId: string): void {
    // Pairing code expires in 5 minutes
    const expiresAt = Date.now() + 5 * 60 * 1000;
    this.pairingCodes.set(pairingCode, { deviceId, expiresAt });
  }

  // Verify pairing code
  verifyPairingCode(pairingCode: string): boolean {
    const codeData = this.pairingCodes.get(pairingCode);
    if (!codeData) return false;

    // Check if code is expired
    if (Date.now() > codeData.expiresAt) {
      this.pairingCodes.delete(pairingCode);
      return false;
    }

    return true;
  }

  // Generate a token
  generateToken(): string {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  }

  // Store token with device ID
  storeToken(token: string, deviceId: string): void {
    // Token expires in 7 days
    const expiresAt = Date.now() + 7 * 24 * 60 * 60 * 1000;
    this.tokens.set(token, { deviceId, expiresAt });
  }

  // Verify token
  verifyToken(token: string): boolean {
    const tokenData = this.tokens.get(token);
    if (!tokenData) return false;

    // Check if token is expired
    if (Date.now() > tokenData.expiresAt) {
      this.tokens.delete(token);
      return false;
    }

    return true;
  }

  // Clean up expired codes and tokens
  cleanup(): void {
    const now = Date.now();

    // Clean up expired pairing codes
    for (const [code, data] of this.pairingCodes.entries()) {
      if (now > data.expiresAt) {
        this.pairingCodes.delete(code);
      }
    }

    // Clean up expired tokens
    for (const [token, data] of this.tokens.entries()) {
      if (now > data.expiresAt) {
        this.tokens.delete(token);
      }
    }
  }
}

// Create singleton instance
const authStorage = new AuthStorage();

// Clean up expired codes/tokens every minute
setInterval(() => authStorage.cleanup(), 60000);

export class AuthHandler implements MessageHandler {
  private server: WebSocketServer;

  constructor(server: WebSocketServer) {
    this.server = server;
  }

  async handle(message: WebSocketMessage, deviceId: string): Promise<void> {
    try {
      const payload = message.payload as any;
      const action = payload.action;
      const data = payload.data;

      logger.info(`Processing auth ${action} for device ${deviceId}`, {
        context: 'AuthHandler',
        metadata: { action, deviceId },
      });

      switch (action) {
        case 'pair':
          await this.handlePairing(deviceId, data);
          break;
        case 'verify':
          await this.handleVerification(deviceId, data);
          break;
        case 'generate_pairing_code':
          await this.handleGeneratePairingCode(deviceId);
          break;
        default:
          this.server.sendErrorToDevice(deviceId, 'INVALID_AUTH_ACTION', `Invalid auth action: ${action}`);
          break;
      }
    } catch (error) {
      logger.error(`Error handling auth message: ${error}`, {
        context: 'AuthHandler',
        metadata: { deviceId },
      });
      this.server.sendErrorToDevice(deviceId, 'AUTH_ERROR', 'Failed to process authentication');
    }
  }

  private async handleGeneratePairingCode(deviceId: string): Promise<void> {
    const pairingCode = authStorage.generatePairingCode();
    authStorage.storePairingCode(pairingCode, deviceId);

    logger.info(`Generated pairing code for device ${deviceId}: ${pairingCode}`, {
      context: 'AuthHandler',
      metadata: { deviceId, pairingCode },
    });

    this.server.sendToDevice(deviceId, {
      type: 'event',
      id: `auth-${Date.now()}`,
      timestamp: Date.now(),
      deviceId: 'server',
      payload: {
        category: 'auth',
        data: {
          action: 'generate_pairing_code',
          success: true,
          pairingCode,
          message: 'Pairing code generated successfully',
        },
      },
    });
  }

  private async handlePairing(deviceId: string, data: any): Promise<void> {
    const pairingCode = data.pairingCode;

    if (!pairingCode) {
      this.server.sendErrorToDevice(deviceId, 'MISSING_PAIRING_CODE', 'Pairing code is required');
      return;
    }

    // Verify pairing code
    if (!authStorage.verifyPairingCode(pairingCode)) {
      this.server.sendErrorToDevice(deviceId, 'INVALID_PAIRING_CODE', 'Invalid or expired pairing code');
      return;
    }

    // Generate token for future authentication
    const token = authStorage.generateToken();
    authStorage.storeToken(token, deviceId);

    logger.info(`Paired device ${deviceId} with code ${pairingCode}`, {
      context: 'AuthHandler',
      metadata: { deviceId, pairingCode },
    });

    // Mark device as authenticated
    this.server.getConnectionManager().setAuthenticated(deviceId, true);

    // Send success response with token
    this.server.sendToDevice(deviceId, {
      type: 'event',
      id: `auth-${Date.now()}`,
      timestamp: Date.now(),
      deviceId: 'server',
      payload: {
        category: 'auth',
        data: {
          action: 'pair',
          success: true,
          token,
          message: 'Device paired successfully',
        },
      },
    });
  }

  private async handleVerification(deviceId: string, data: any): Promise<void> {
    const token = data.token;

    if (!token) {
      this.server.sendErrorToDevice(deviceId, 'MISSING_TOKEN', 'Token is required');
      return;
    }

    // Verify token
    if (!authStorage.verifyToken(token)) {
      this.server.sendErrorToDevice(deviceId, 'INVALID_TOKEN', 'Invalid or expired token');
      return;
    }

    logger.info(`Verified token for device ${deviceId}`, {
      context: 'AuthHandler',
      metadata: { deviceId },
    });

    // Mark device as authenticated
    this.server.getConnectionManager().setAuthenticated(deviceId, true);

    // Send success response
    this.server.sendToDevice(deviceId, {
      type: 'event',
      id: `auth-${Date.now()}`,
      timestamp: Date.now(),
      deviceId: 'server',
      payload: {
        category: 'auth',
        data: {
          action: 'verify',
          success: true,
          message: 'Token verified successfully',
        },
      },
    });
  }
}
