import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import redisClient from '../redis/redisClient';

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

  async verifyToken(token: string): Promise<TokenPayload | null> {
    try {
      const decoded = jwt.verify(token, this.secretKey) as TokenPayload;
      if (await this.isTokenRevoked(token) || await this.isDeviceBlacklisted(decoded.deviceId)) {
        return null;
      }
      return decoded;
    } catch (error) {
      return null;
    }
  }

  async verifyRefreshToken(token: string): Promise<RefreshTokenPayload | null> {
    try {
      const decoded = jwt.verify(token, this.refreshSecretKey) as RefreshTokenPayload;
      if (await this.isTokenRevoked(token) || await this.isDeviceBlacklisted(decoded.deviceId)) {
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

  async revokeToken(token: string): Promise<void> {
    // 设置令牌过期时间为7天（与刷新令牌一致）
    await redisClient.sadd('revoked_tokens', token);
    await redisClient.expire('revoked_tokens', 7 * 24 * 60 * 60);
  }

  async revokeAllDeviceTokens(deviceId: string): Promise<void> {
    const tokens = await this.getDeviceTokens(deviceId);
    for (const token of tokens) {
      await this.revokeToken(token);
    }
  }

  async blacklistDevice(deviceId: string): Promise<void> {
    await redisClient.sadd('device_blacklist', deviceId);
    await this.revokeAllDeviceTokens(deviceId);
  }

  async removeDeviceFromBlacklist(deviceId: string): Promise<void> {
    await redisClient.srem('device_blacklist', deviceId);
  }

  async isDeviceBlacklisted(deviceId: string): Promise<boolean> {
    return await redisClient.sismember('device_blacklist', deviceId);
  }

  async isTokenRevoked(token: string): Promise<boolean> {
    const isRevoked = await redisClient.sismember('revoked_tokens', token);
    const isUsed = await redisClient.sismember('used_refresh_tokens', token);
    return isRevoked || isUsed;
  }

  async refreshToken(oldRefreshToken: string): Promise<{ token: string; refreshToken: string } | null> {
    try {
      // 验证旧的刷新令牌
      const decoded = this.verifyRefreshToken(oldRefreshToken);
      if (!decoded) {
        return null;
      }

      // 检查刷新令牌是否已经被使用过
      const isUsed = await redisClient.sismember('used_refresh_tokens', oldRefreshToken);
      if (isUsed) {
        return null;
      }

      // 标记旧的刷新令牌为已使用
      await redisClient.sadd('used_refresh_tokens', oldRefreshToken);
      await redisClient.expire('used_refresh_tokens', 7 * 24 * 60 * 60);

      // 吊销旧的刷新令牌
      await this.revokeToken(oldRefreshToken);

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
      console.error('Token refresh error:', error);
      return null;
    }
  }

  private async addTokenToDevice(deviceId: string, token: string): Promise<void> {
    await redisClient.sadd(`device_tokens:${deviceId}`, token);
    await redisClient.expire(`device_tokens:${deviceId}`, 7 * 24 * 60 * 60);
  }

  private async getDeviceTokens(deviceId: string): Promise<string[]> {
    return await redisClient.smembers(`device_tokens:${deviceId}`);
  }

  private generateJti(): string {
    return crypto.randomUUID();
  }
}

export default new TokenManager();
