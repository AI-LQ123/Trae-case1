import jwt from 'jsonwebtoken';

export interface TokenPayload {
  deviceId: string;
  userId: string;
  role: string;
}

export interface RefreshTokenPayload {
  deviceId: string;
  userId: string;
  jti: string;
}

class TokenManager {
  private secretKey: string;
  private refreshSecretKey: string;
  private revokedTokens: Set<string> = new Set();
  private deviceBlacklist: Set<string> = new Set();
  private deviceTokens: Map<string, Set<string>> = new Map();

  constructor() {
    this.secretKey = process.env.JWT_SECRET as string;
    this.refreshSecretKey = process.env.JWT_REFRESH_SECRET as string;
    
    if (!this.secretKey || !this.refreshSecretKey) {
      throw new Error('JWT_SECRET and JWT_REFRESH_SECRET environment variables are required');
    }
  }

  generateToken(payload: TokenPayload): string {
    const token = jwt.sign(payload, this.secretKey, { expiresIn: '2h' });
    this.addTokenToDevice(payload.deviceId, token);
    return token;
  }

  generateRefreshToken(payload: TokenPayload): string {
    const refreshPayload: RefreshTokenPayload = {
      deviceId: payload.deviceId,
      userId: payload.userId,
      jti: this.generateJti()
    };
    const refreshToken = jwt.sign(refreshPayload, this.refreshSecretKey, { expiresIn: '7d' });
    this.addTokenToDevice(payload.deviceId, refreshToken);
    return refreshToken;
  }

  verifyToken(token: string): TokenPayload | null {
    try {
      const decoded = jwt.verify(token, this.secretKey) as TokenPayload;
      if (this.isTokenRevoked(token) || this.isDeviceBlacklisted(decoded.deviceId)) {
        return null;
      }
      return decoded;
    } catch (error) {
      return null;
    }
  }

  verifyRefreshToken(token: string): RefreshTokenPayload | null {
    try {
      const decoded = jwt.verify(token, this.refreshSecretKey) as RefreshTokenPayload;
      if (this.isTokenRevoked(token) || this.isDeviceBlacklisted(decoded.deviceId)) {
        return null;
      }
      return decoded;
    } catch (error) {
      return null;
    }
  }

  decodeToken(token: string): TokenPayload | null {
    try {
      return jwt.decode(token) as TokenPayload;
    } catch (error) {
      return null;
    }
  }

  revokeToken(token: string): void {
    this.revokedTokens.add(token);
  }

  revokeAllDeviceTokens(deviceId: string): void {
    const tokens = this.deviceTokens.get(deviceId);
    if (tokens) {
      tokens.forEach(token => this.revokeToken(token));
    }
  }

  blacklistDevice(deviceId: string): void {
    this.deviceBlacklist.add(deviceId);
    this.revokeAllDeviceTokens(deviceId);
  }

  removeDeviceFromBlacklist(deviceId: string): void {
    this.deviceBlacklist.delete(deviceId);
  }

  isDeviceBlacklisted(deviceId: string): boolean {
    return this.deviceBlacklist.has(deviceId);
  }

  isTokenRevoked(token: string): boolean {
    return this.revokedTokens.has(token);
  }

  private addTokenToDevice(deviceId: string, token: string): void {
    if (!this.deviceTokens.has(deviceId)) {
      this.deviceTokens.set(deviceId, new Set());
    }
    this.deviceTokens.get(deviceId)!.add(token);
  }

  private generateJti(): string {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  }
}

export default new TokenManager();
