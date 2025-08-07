const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
const dotenv = require('dotenv');

const { GameService } = require('./services/gameService');
const { MatchmakingService } = require('./services/matchmakingService');
const { BackgroundService } = require('./services/backgroundService');
const { SocketHandlers } = require('./sockets/socketHandlers');

// Load environment variables
dotenv.config();

const dirname = path.resolve();

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.NODE_ENV === 'production' 
      ? process.env.CLIENT_URL || false
      : ["http://localhost:3000", "http://127.0.0.1:3000"],
    methods: ["GET", "POST"],
    credentials: true
  }
});

const PORT = process.env.PORT || 3001;

// Middleware
app.use(helmet({
  contentSecurityPolicy: false // Allow inline styles for development
}));
app.use(cors());
app.use(express.json());

// Serve static files from client build
if (process.env.NODE_ENV === 'production') {
  const clientBuildPath = path.join(__dirname, '../../client/dist');
  app.use(express.static(clientBuildPath));
}

// Services
const gameService = new GameService();
const matchmakingService = new MatchmakingService();
const backgroundService = new BackgroundService();
const socketHandlers = new SocketHandlers(gameService, matchmakingService, backgroundService);

// Socket registry for tracking connections
const socketRegistry = new Map<string, string>(); // playerId -> socketId
const reverseSocketRegistry = new Map<string, string>(); // socketId -> playerId

// Update socket handlers to use registry
const originalFindSocketByPlayerId = (socketHandlers as any).findSocketByPlayerId;
(socketHandlers as any).findSocketByPlayerId = (playerId: string) => {
  const socketId = socketRegistry.get(playerId);
  if (!socketId) return null;
  
  return Array.from(io.sockets.sockets.values()).find((socket: any) => socket.id === socketId) || null;
};

// Socket.IO connection handling
io.on('connection', (socket: any) => {
  console.log('Player connected:', socket.id);

  // Register socket events
  socket.on('join-queue', () => socketHandlers.handleJoinQueue(socket));
  socket.on('leave-queue', () => socketHandlers.handleLeaveQueue(socket));
  socket.on('place-ship', (data: any) => socketHandlers.handlePlaceShip(socket, data));
  socket.on('ready-to-play', () => socketHandlers.handleReadyToPlay(socket));
  socket.on('fire-shot', (position: any) => socketHandlers.handleFireShot(socket, position));
  socket.on('reconnect-game', (gameId: any) => socketHandlers.handleReconnectGame(socket, gameId));

  // Track socket in registry
  socket.on('disconnect', async () => {
    console.log('Player disconnected:', socket.id);
    
    // Clean up registries
    const playerId = reverseSocketRegistry.get(socket.id);
    if (playerId) {
      socketRegistry.delete(playerId);
      reverseSocketRegistry.delete(socket.id);
    }
    
    await socketHandlers.handleDisconnect(socket);
  });

  // Update registries when player joins game
  socket.on('join-queue', () => {
    if (socket.data.playerId) {
      socketRegistry.set(socket.data.playerId, socket.id);
      reverseSocketRegistry.set(socket.id, socket.data.playerId);
    }
  });
});

// Health check endpoint
app.get('/health', (req: any, res: any) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    games: gameService.getActiveGamesCount(),
    queue: matchmakingService.getQueueSize(),
    backgroundService: backgroundService.getServiceStatus()
  });
});

// API endpoint for background service status
app.get('/api/background-status', (req: any, res: any) => {
  res.json(backgroundService.getServiceStatus());
});

// Serve client app for all other routes (SPA routing)
if (process.env.NODE_ENV === 'production') {
  app.get('*', (req: any, res: any) => {
    res.sendFile(path.join(dirname, '../../client/dist/index.html'));
  });
}

// Cleanup intervals
setInterval(() => {
  matchmakingService.cleanupInactivePlayers();
  gameService.cleanupInactiveGames();
}, 60000); // Every minute

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`Background service: ${backgroundService.isServiceAvailable() ? 'Available' : 'Fallback mode'}`);
});