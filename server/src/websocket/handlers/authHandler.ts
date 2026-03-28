import { WebSocketMessage } from '../../models/types';
import { MessageHandler } from '../messageRouter';
import { WebSocketServer } from '../server';
import { logger } from '../../utils/logger';

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

  private async handlePairing(deviceId: string, data: any): Promise<void> {
    const pairingCode = data.pairingCode;

    if (!pairingCode) {
      this.server.sendErrorToDevice(deviceId, 'MISSING_PAIRING_CODE', 'Pairing code is required');
      return;
    }

    // TODO: Implement actual pairing logic
    // For now, just simulate successful pairing
    logger.info(`Pairing device ${deviceId} with code ${pairingCode}`, {
      context: 'AuthHandler',
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
          action: 'pair',
          success: true,
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

    // TODO: Implement actual token verification logic
    // For now, just simulate successful verification
    logger.info(`Verifying token for device ${deviceId}`, {
      context: 'AuthHandler',
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
