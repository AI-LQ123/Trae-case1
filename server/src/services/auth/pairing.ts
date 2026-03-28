import crypto from 'crypto';

interface PairingSession {
  id: string;
  code: string;
  createdAt: Date;
  expiresAt: Date;
  deviceId?: string;
  paired: boolean;
}

class PairingService {
  private sessions: Map<string, PairingSession> = new Map();

  generatePairingCode(): PairingSession {
    const code = crypto.randomBytes(3).toString('hex').toUpperCase();
    const id = crypto.randomUUID();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 5 * 60 * 1000); // 5分钟过期

    const session: PairingSession = {
      id,
      code,
      createdAt: now,
      expiresAt,
      paired: false
    };

    this.sessions.set(id, session);

    // 清理过期会话
    this.cleanupExpiredSessions();

    return session;
  }

  validatePairingCode(code: string): PairingSession | null {
    this.cleanupExpiredSessions();

    for (const session of this.sessions.values()) {
      if (session.code === code && session.expiresAt > new Date() && !session.paired) {
        return session;
      }
    }

    return null;
  }

  completePairing(sessionId: string, deviceId: string): boolean {
    const session = this.sessions.get(sessionId);
    if (session && !session.paired && session.expiresAt > new Date()) {
      session.paired = true;
      session.deviceId = deviceId;
      return true;
    }
    return false;
  }

  cleanupExpiredSessions() {
    const now = new Date();
    for (const [id, session] of this.sessions.entries()) {
      if (session.expiresAt < now) {
        this.sessions.delete(id);
      }
    }
  }

  getSessionById(sessionId: string): PairingSession | null {
    this.cleanupExpiredSessions();
    return this.sessions.get(sessionId) || null;
  }
}

export default new PairingService();
