import { NextFunction, Request, Response } from 'express';
import tokenManager from '../services/auth/tokenManager';
import { TokenPayload } from '../services/auth/tokenManager';

export interface AuthenticatedRequest extends Request {
  user?: TokenPayload;
}

interface ApiResponse {
  success: boolean;
  error?: string;
  code?: number;
  data?: any;
}

export const authMiddleware = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({
      success: false,
      error: 'Authorization header required',
      code: 401
    } as ApiResponse);
  }

  const token = authHeader.replace('Bearer ', '');
  const payload = await tokenManager.verifyToken(token);
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
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({
        success: false,
        error: 'Authorization header required',
        code: 401
      } as ApiResponse);
    }

    const token = authHeader.replace('Bearer ', '');
    const payload = await tokenManager.verifyToken(token);
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

export const websocketAuthMiddleware = async (token: string): Promise<TokenPayload | null> => {
  return await tokenManager.verifyToken(token);
};

export const websocketAuthHandler = async (token: string, callback: (error: Error | null, payload: any) => void) => {
  const payload = await tokenManager.verifyToken(token);
  if (!payload) {
    callback(new Error('Invalid or expired token'), null);
  } else {
    callback(null, payload);
  }
};
