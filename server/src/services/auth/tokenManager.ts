import jwt from 'jsonwebtoken';

interface TokenPayload {
  deviceId: string;
  userId: string;
  role: string;
}

class TokenManager {
  private secretKey: string;

  constructor() {
    this.secretKey = process.env.JWT_SECRET || 'trae-mobile-secret-key';
  }

  generateToken(payload: TokenPayload): string {
    return jwt.sign(payload, this.secretKey, { expiresIn: '7d' });
  }

  verifyToken(token: string): TokenPayload | null {
    try {
      return jwt.verify(token, this.secretKey) as TokenPayload;
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
}

export default new TokenManager();
