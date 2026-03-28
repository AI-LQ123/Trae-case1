import { WebSocketServer } from './websocket/server';
import { createServer } from 'http';
import express from 'express';
import pairingService from './services/auth/pairing';
import tokenManager from './services/auth/tokenManager';
import { authMiddleware } from './middleware/authMiddleware';

const app = express();
const server = createServer(app);

const PORT = process.env.PORT || 3001;

const wss = new WebSocketServer(server);

app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Auth API routes
app.post('/api/auth/pair', (req, res) => {
  const { code, deviceId, deviceName } = req.body;
  
  if (!code || !deviceId) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const session = pairingService.validatePairingCode(code);
  if (!session) {
    return res.status(400).json({ error: 'Invalid or expired pairing code' });
  }

  const success = pairingService.completePairing(session.id, deviceId);
  if (!success) {
    return res.status(400).json({ error: 'Pairing failed' });
  }

  const token = tokenManager.generateToken({
    deviceId,
    userId: 'user_1', // For demo purposes
    role: 'user'
  });

  res.json({
    token,
    deviceId,
    userId: 'user_1'
  });
});

app.get('/api/auth/validate', authMiddleware, (req, res) => {
  res.json({ valid: true, user: req.user });
});

app.post('/api/auth/generate-code', (req, res) => {
  const session = pairingService.generatePairingCode();
  res.json({ code: session.code, sessionId: session.id });
});

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
