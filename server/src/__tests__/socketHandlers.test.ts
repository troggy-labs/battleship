import { describe, it, expect, beforeEach, vi, Mock } from 'vitest';
import { SocketHandlers } from '../sockets/socketHandlers';
import { GameService } from '../services/gameService';
import { MatchmakingService } from '../services/matchmakingService';
import { BackgroundService } from '../services/backgroundService';

// Mock socket
const createMockSocket = () => ({
  id: 'socket123',
  emit: vi.fn(),
  join: vi.fn(),
  leave: vi.fn(),
  data: {}
});

// Mock services
vi.mock('../services/gameService');
vi.mock('../services/matchmakingService');  
vi.mock('../services/backgroundService');

describe('SocketHandlers', () => {
  let socketHandlers: SocketHandlers;
  let mockGameService: GameService;
  let mockMatchmakingService: MatchmakingService;
  let mockBackgroundService: BackgroundService;
  let mockSocket: ReturnType<typeof createMockSocket>;

  beforeEach(() => {
    mockGameService = new GameService();
    mockMatchmakingService = new MatchmakingService();
    mockBackgroundService = new BackgroundService();
    
    socketHandlers = new SocketHandlers(
      mockGameService,
      mockMatchmakingService,
      mockBackgroundService
    );
    
    mockSocket = createMockSocket();
    
    // Reset all mocks
    vi.clearAllMocks();
  });

  describe('Join Queue', () => {
    it('should handle player joining queue', async () => {
      const mockPlayer = {
        id: 'player1',
        sessionId: 'socket123',
        isReady: false,
        lastActivity: expect.any(Number),
        board: expect.any(Object)
      };

      (mockMatchmakingService.addToQueue as Mock).mockReturnValue(undefined);
      (mockMatchmakingService.attemptMatch as Mock).mockReturnValue(null);

      await socketHandlers.handleJoinQueue(mockSocket);

      expect(mockMatchmakingService.addToQueue).toHaveBeenCalledWith(
        expect.objectContaining({
          sessionId: 'socket123'
        })
      );
      expect(mockSocket.emit).toHaveBeenCalledWith('queue-joined');
    });

    it('should create game when match found', async () => {
      const mockGame = {
        id: 'game123',
        players: [
          { id: 'player1', sessionId: 'socket123' },
          { id: 'player2', sessionId: 'socket456' }
        ],
        phase: 'placement'
      };

      (mockMatchmakingService.addToQueue as Mock).mockReturnValue(undefined);
      (mockMatchmakingService.attemptMatch as Mock).mockReturnValue(mockGame);
      (mockGameService.createGame as Mock).mockReturnValue(mockGame);
      (mockBackgroundService.generateBackground as Mock).mockResolvedValue('bg-url');

      await socketHandlers.handleJoinQueue(mockSocket);

      expect(mockGameService.createGame).toHaveBeenCalledWith(mockGame);
      expect(mockBackgroundService.generateBackground).toHaveBeenCalledWith('game123');
      expect(mockSocket.emit).toHaveBeenCalledWith('game-found', expect.any(Object));
    });
  });

  describe('Ship Placement', () => {
    beforeEach(() => {
      mockSocket.data.playerId = 'player1';
      mockSocket.data.gameId = 'game123';
    });

    it('should handle valid ship placement', async () => {
      const placementData = {
        shipId: 'destroyer1',
        positions: [{ row: 0, col: 0 }, { row: 0, col: 1 }]
      };

      const mockResult = {
        success: true,
        ship: {
          id: 'destroyer1',
          type: 'destroyer',
          positions: placementData.positions,
          isPlaced: true
        }
      };

      (mockGameService.placeShip as Mock).mockResolvedValue(mockResult);

      await socketHandlers.handlePlaceShip(mockSocket, placementData);

      expect(mockGameService.placeShip).toHaveBeenCalledWith(
        'game123',
        'player1',
        'destroyer1',
        placementData.positions
      );
      expect(mockSocket.emit).toHaveBeenCalledWith('ship-placed', {
        ship: mockResult.ship,
        isValid: true
      });
    });

    it('should handle invalid ship placement', async () => {
      const placementData = {
        shipId: 'destroyer1',
        positions: [{ row: 0, col: 0 }, { row: 0, col: 1 }]
      };

      const mockResult = {
        success: false,
        error: 'Invalid position'
      };

      (mockGameService.placeShip as Mock).mockResolvedValue(mockResult);

      await socketHandlers.handlePlaceShip(mockSocket, placementData);

      expect(mockSocket.emit).toHaveBeenCalledWith('ship-placed', {
        ship: undefined,
        isValid: false,
        error: 'Invalid position'
      });
    });
  });

  describe('Fire Shot', () => {
    beforeEach(() => {
      mockSocket.data.playerId = 'player1';
      mockSocket.data.gameId = 'game123';
    });

    it('should handle successful shot', async () => {
      const position = { row: 5, col: 5 };
      const mockResult = {
        success: true,
        result: 'hit' as const,
        position,
        gameOver: false
      };

      (mockGameService.fireShot as Mock).mockResolvedValue(mockResult);

      await socketHandlers.handleFireShot(mockSocket, position);

      expect(mockGameService.fireShot).toHaveBeenCalledWith(
        'game123',
        'player1',
        position
      );
      expect(mockSocket.emit).toHaveBeenCalledWith('shot-result', {
        position,
        result: 'hit',
        gameOver: false
      });
    });

    it('should handle ship sunk', async () => {
      const position = { row: 5, col: 5 };
      const mockSunkShip = {
        id: 'destroyer1',
        type: 'destroyer',
        size: 2,
        isSunk: true
      };

      const mockResult = {
        success: true,
        result: 'sunk' as const,
        position,
        shipSunk: mockSunkShip,
        gameOver: false
      };

      (mockGameService.fireShot as Mock).mockResolvedValue(mockResult);

      await socketHandlers.handleFireShot(mockSocket, position);

      expect(mockSocket.emit).toHaveBeenCalledWith('shot-result', {
        position,
        result: 'sunk',
        shipSunk: mockSunkShip,
        gameOver: false
      });
    });

    it('should handle game over', async () => {
      const position = { row: 5, col: 5 };
      const mockResult = {
        success: true,
        result: 'hit' as const,
        position,
        gameOver: true,
        winner: 'player1'
      };

      (mockGameService.fireShot as Mock).mockResolvedValue(mockResult);

      await socketHandlers.handleFireShot(mockSocket, position);

      expect(mockSocket.emit).toHaveBeenCalledWith('shot-result', {
        position,
        result: 'hit',
        gameOver: true
      });
    });
  });

  describe('Player Ready', () => {
    beforeEach(() => {
      mockSocket.data.playerId = 'player1';
      mockSocket.data.gameId = 'game123';
    });

    it('should handle player ready', async () => {
      const mockGame = {
        id: 'game123',
        phase: 'playing',
        players: [
          { id: 'player1', isReady: true },
          { id: 'player2', isReady: true }
        ]
      };

      (mockGameService.setPlayerReady as Mock).mockResolvedValue(mockGame);

      await socketHandlers.handleReadyToPlay(mockSocket);

      expect(mockGameService.setPlayerReady).toHaveBeenCalledWith(
        'game123',
        'player1'
      );
      expect(mockSocket.emit).toHaveBeenCalledWith('game-state', expect.any(Object));
    });
  });

  describe('Reconnection', () => {
    it('should handle game reconnection', async () => {
      const gameId = 'game123';
      const mockGame = {
        id: gameId,
        players: [
          { id: 'player1', sessionId: 'old-session' },
          { id: 'player2', sessionId: 'socket456' }
        ]
      };

      (mockGameService.getGame as Mock).mockReturnValue(mockGame);
      (mockGameService.reconnectPlayer as Mock).mockResolvedValue(mockGame);

      await socketHandlers.handleReconnectGame(mockSocket, gameId);

      expect(mockGameService.reconnectPlayer).toHaveBeenCalledWith(
        gameId,
        'player1',
        'socket123'
      );
      expect(mockSocket.data.gameId).toBe(gameId);
      expect(mockSocket.data.playerId).toBe('player1');
    });

    it('should handle reconnection to non-existent game', async () => {
      const gameId = 'nonexistent';

      (mockGameService.getGame as Mock).mockReturnValue(null);

      await socketHandlers.handleReconnectGame(mockSocket, gameId);

      expect(mockSocket.emit).toHaveBeenCalledWith('error', 'Game not found');
    });
  });

  describe('Disconnect Handling', () => {
    beforeEach(() => {
      mockSocket.data.playerId = 'player1';
      mockSocket.data.gameId = 'game123';
    });

    it('should handle player disconnect', async () => {
      await socketHandlers.handleDisconnect(mockSocket);

      expect(mockGameService.handlePlayerDisconnect).toHaveBeenCalledWith(
        'game123',
        'player1'
      );
    });

    it('should remove from queue on disconnect', async () => {
      mockSocket.data.gameId = undefined; // Player in queue, not in game

      await socketHandlers.handleDisconnect(mockSocket);

      expect(mockMatchmakingService.removeFromQueue).toHaveBeenCalledWith('player1');
    });
  });
});