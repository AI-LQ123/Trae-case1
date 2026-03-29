import { WebSocketServer } from './websocket/server';
import { createServer } from 'http';
import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import pairingService from './services/auth/pairing';
import tokenManager from './services/auth/tokenManager';
import { authMiddleware, AuthenticatedRequest } from './middleware/authMiddleware';
import projectRoutes from './api/routes/project';
import fileRoutes from './api/routes/file';
import notificationRouter from './api/routes/notification';
import { sqliteService } from './services/db/sqliteService';

export const app = express();
const server = createServer(app);

const PORT = process.env.PORT || 3001;

// CORS configuration
const corsOptions = {
  origin: '*', // In production, replace with specific origins
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};
app.use(cors(corsOptions));

// Rate limiting
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Limit each IP to 10 requests per windowMs
  message: {
    success: false,
    error: 'Too many authentication requests, please try again later',
    code: 429
  }
});

app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Auth API routes
app.post('/api/auth/pair', authLimiter, async (req, res) => {
  const { code, deviceId, deviceName, platform, version } = req.body;
  
  if (!code || !deviceId) {
    return res.status(400).json({
      success: false,
      error: 'Missing required fields',
      code: 400
    });
  }

  const session = await pairingService.validatePairingCode(code);
  if (!session) {
    return res.status(400).json({
      success: false,
      error: 'Invalid or expired pairing code',
      code: 400
    });
  }

  const success = await pairingService.completePairing(
    session.id, 
    deviceId, 
    deviceName || 'Unknown Device', 
    platform || 'Unknown', 
    version || '1.0.0'
  );
  if (!success) {
    return res.status(400).json({
      success: false,
      error: 'Pairing failed',
      code: 400
    });
  }

  const token = tokenManager.generateToken({
    deviceId,
    userId: 'user_1', // For demo purposes
    role: 'user'
  });

  const refreshToken = tokenManager.generateRefreshToken({
    deviceId,
    userId: 'user_1',
    role: 'user'
  });

  res.json({
    token,
    refreshToken,
    deviceId,
    userId: 'user_1'
  });
});

app.post('/api/auth/refresh', async (req, res) => {
  const { refreshToken } = req.body;
  
  if (!refreshToken) {
    return res.status(400).json({
      success: false,
      error: 'Refresh token required',
      code: 400
    });
  }

  const result = await tokenManager.refreshToken(refreshToken);
  if (!result) {
    return res.status(401).json({
      success: false,
      error: 'Invalid or expired refresh token',
      code: 401
    });
  }

  res.json({
    token: result.token,
    refreshToken: result.refreshToken
  });
});

app.get('/api/auth/validate', authMiddleware, (req: AuthenticatedRequest, res) => {
  res.json({
    success: true,
    data: { valid: true, user: req.user }
  });
});

app.post('/api/auth/generate-code', authLimiter, async (req, res) => {
  const session = await pairingService.generatePairingCode();
  res.json({
    success: true,
    data: { code: session.code, sessionId: session.id }
  });
});

app.post('/api/auth/logout', authMiddleware, async (req, res) => {
  const authHeader = req.headers.authorization;
  if (authHeader) {
    const token = authHeader.replace('Bearer ', '');
    await tokenManager.revokeToken(token);
  }
  
  res.json({
    success: true,
    data: { message: 'Logged out successfully' }
  });
});

// Project and File API routes
app.use('/api/project', projectRoutes);
app.use('/api/file', fileRoutes);
app.use('/api/notification', notificationRouter);

const wss = new WebSocketServer(server);

server.listen(PORT, () => {
  console.log(`🚀 Trae Mobile Server running on port ${PORT}`);
  console.log(`📱 WebSocket server ready for connections`);
});

process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('Server closed');
    sqliteService.close();
    console.log('SQLite connection closed');
    process.exit(0);
  });
});
