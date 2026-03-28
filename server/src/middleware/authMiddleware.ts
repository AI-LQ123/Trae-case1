import { NextFunction, Request, Response } from 'express';
import tokenManager from '../services/auth/tokenManager';

interface AuthenticatedRequest extends Request {
  user?: {
    deviceId: string;
    userId: string;
    role: string;
  };
}

interface ApiResponse {
  success: boolean;
  error?: string;
  code?: number;
  data?: any;
}

export const authMiddleware = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({
      success: false,
      error: 'Authorization header required',
      code: 401
    } as ApiResponse);
  }

  const token = authHeader.replace('Bearer ', '');
  const payload = tokenManager.verifyToken(token);
  if (!payload) {
    return res.status(401).json({
      success: false,
      error: 'Invalid or expired token',
      code: 401
    } as ApiResponse);
  }

  req.user = payload;
  next();
};

export const authMiddlewareWithRoles = (requiredRoles: string[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({
        success: false,
        error: 'Authorization header required',
        code: 401
      } as ApiResponse);
    }

    const token = authHeader.replace('Bearer ', '');
    const payload = tokenManager.verifyToken(token);
    if (!payload) {
      return res.status(401).json({
        success: false,
        error: 'Invalid or expired token',
        code: 401
      } as ApiResponse);
    }

    if (!requiredRoles.includes(payload.role)) {
      return res.status(403).json({
        success: false,
        error: 'Insufficient permissions',
        code: 403
      } as ApiResponse);
    }

    req.user = payload;
    next();
  };
};

export const websocketAuthMiddleware = (token: string) => {
  return tokenManager.verifyToken(token);
};

export const websocketAuthHandler = (token: string, callback: (error: Error | null, payload: any) => void) => {
  const payload = tokenManager.verifyToken(token);
  if (!payload) {
    callback(new Error('Invalid or expired token'), null);
  } else {
    callback(null, payload);
  }
};
