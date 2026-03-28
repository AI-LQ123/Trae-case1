import { WebSocketServer } from './websocket/server';
import { createServer } from 'http';
import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import pairingService from './services/auth/pairing';
import tokenManager from './services/auth/tokenManager';
import { authMiddleware } from './middleware/authMiddleware';

const app = express();
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
app.post('/api/auth/pair', authLimiter, (req, res) => {
  const { code, deviceId, deviceName } = req.body;
  
  if (!code || !deviceId) {
    return res.status(400).json({
      success: false,
      error: 'Missing required fields',
      code: 400
    });
  }

  const session = pairingService.validatePairingCode(code);
  if (!session) {
    return res.status(400).json({
      success: false,
      error: 'Invalid or expired pairing code',
      code: 400
    });
  }

  const success = pairingService.completePairing(session.id, deviceId);
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

app.post('/api/auth/refresh', (req, res) => {
  const { refreshToken } = req.body;
  
  if (!refreshToken) {
    return res.status(400).json({
      success: false,
      error: 'Refresh token required',
      code: 400
    });
  }

  const payload = tokenManager.verifyRefreshToken(refreshToken);
  if (!payload) {
    return res.status(401).json({
      success: false,
      error: 'Invalid or expired refresh token',
      code: 401
    });
  }

  const newToken = tokenManager.generateToken({
    deviceId: payload.deviceId,
    userId: payload.userId,
    role: 'user'
  });

  const newRefreshToken = tokenManager.generateRefreshToken({
    deviceId: payload.deviceId,
    userId: payload.userId,
    role: 'user'
  });

  res.json({
    token: newToken,
    refreshToken: newRefreshToken
  });
});

app.get('/api/auth/validate', authMiddleware, (req, res) => {
  res.json({
    success: true,
    data: { valid: true, user: req.user }
  });
});

app.post('/api/auth/generate-code', authLimiter, (req, res) => {
  const session = pairingService.generatePairingCode();
  res.json({
    success: true,
    data: { code: session.code, sessionId: session.id }
  });
});

app.post('/api/auth/logout', authMiddleware, (req, res) => {
  const authHeader = req.headers.authorization;
  if (authHeader) {
    const token = authHeader.replace('Bearer ', '');
    tokenManager.revokeToken(token);
  }
  
  res.json({
    success: true,
    data: { message: 'Logged out successfully' }
  });
});

const wss = new WebSocketServer(server);

server.listen(PORT, () => {
  console.log(`🚀 Trae Mobile Server running on port ${PORT}`);
  console.log(`📱 WebSocket server ready for connections`);
});

process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});
