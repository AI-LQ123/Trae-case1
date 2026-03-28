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

  constructor() {
    this.secretKey = process.env.JWT_SECRET as string;
    this.refreshSecretKey = process.env.JWT_REFRESH_SECRET as string;
    
    if (!this.secretKey || !this.refreshSecretKey) {
      throw new Error('JWT_SECRET and JWT_REFRESH_SECRET environment variables are required');
    }
  }

  generateToken(payload: TokenPayload): string {
    return jwt.sign(payload, this.secretKey, { expiresIn: '2h' });
  }

  generateRefreshToken(payload: TokenPayload): string {
    const refreshPayload: RefreshTokenPayload = {
      deviceId: payload.deviceId,
      userId: payload.userId,
      jti: this.generateJti()
    };
    return jwt.sign(refreshPayload, this.refreshSecretKey, { expiresIn: '7d' });
  }

  verifyToken(token: string): TokenPayload | null {
    try {
      const decoded = jwt.verify(token, this.secretKey) as TokenPayload;
      if (this.isTokenRevoked(token)) {
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
      if (this.isTokenRevoked(token)) {
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

  isTokenRevoked(token: string): boolean {
    return this.revokedTokens.has(token);
  }

  private generateJti(): string {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  }
}

export default new TokenManager();
