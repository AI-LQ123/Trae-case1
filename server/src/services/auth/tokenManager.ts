import jwt from 'jsonwebtoken';
import crypto from 'crypto';

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
  private usedRefreshTokens: Set<string> = new Set();

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
    return this.revokedTokens.has(token) || this.usedRefreshTokens.has(token);
  }

  refreshToken(oldRefreshToken: string): { token: string; refreshToken: string } | null {
    try {
      // 验证旧的刷新令牌
      const decoded = this.verifyRefreshToken(oldRefreshToken);
      if (!decoded) {
        return null;
      }

      // 检查刷新令牌是否已经被使用过
      if (this.usedRefreshTokens.has(oldRefreshToken)) {
        return null;
      }

      // 标记旧的刷新令牌为已使用
      this.usedRefreshTokens.add(oldRefreshToken);

      // 吊销旧的刷新令牌
      this.revokeToken(oldRefreshToken);

      // 生成新的令牌负载
      const payload: TokenPayload = {
        deviceId: decoded.deviceId,
        userId: decoded.userId,
        role: 'user'
      };

      // 生成新的访问令牌和刷新令牌
      const newToken = this.generateToken(payload);
      const newRefreshToken = this.generateRefreshToken(payload);

      return { token: newToken, refreshToken: newRefreshToken };
    } catch (error) {
      return null;
    }
  }

  private addTokenToDevice(deviceId: string, token: string): void {
    if (!this.deviceTokens.has(deviceId)) {
      this.deviceTokens.set(deviceId, new Set());
    }
    this.deviceTokens.get(deviceId)!.add(token);
  }

  private generateJti(): string {
    return crypto.randomUUID();
  }
}

export default new TokenManager();
