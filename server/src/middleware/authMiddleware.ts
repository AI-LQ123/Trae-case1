import { NextFunction, Request, Response } from 'express';
import tokenManager from '../services/auth/tokenManager';

interface AuthenticatedRequest extends Request {
  user?: {
    deviceId: string;
    userId: string;
    role: string;
  };
}

export const authMiddleware = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ error: 'Authorization header required' });
  }

  const token = authHeader.replace('Bearer ', '');
  const payload = tokenManager.verifyToken(token);
  if (!payload) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }

  req.user = payload;
  next();
};

export const websocketAuthMiddleware = (token: string) => {
  return tokenManager.verifyToken(token);
};
