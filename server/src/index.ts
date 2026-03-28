import { WebSocketServer } from './websocket/server';
import { createServer } from 'http';
import express from 'express';

const app = express();
const server = createServer(app);

const PORT = process.env.PORT || 3001;

const wss = new WebSocketServer(server);

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
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
