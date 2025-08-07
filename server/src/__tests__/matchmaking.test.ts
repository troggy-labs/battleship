import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MatchmakingService } from '../services/matchmakingService';
import { Player } from '../../../shared/types';

describe('MatchmakingService', () => {
  let matchmakingService: MatchmakingService;
  let mockPlayer1: Player;
  let mockPlayer2: Player;
  let mockPlayer3: Player;

  beforeEach(() => {
    matchmakingService = new MatchmakingService();
    
    mockPlayer1 = {
      id: 'player1',
      sessionId: 'session1',
      isReady: false,
      lastActivity: Date.now(),
      board: {
        ships: [],
        grid: [],
        shipsRemaining: 5
      }
    };

    mockPlayer2 = {
      id: 'player2',
      sessionId: 'session2',
      isReady: false,
      lastActivity: Date.now(),
      board: {
        ships: [],
        grid: [],
        shipsRemaining: 5
      }
    };

    mockPlayer3 = {
      id: 'player3',
      sessionId: 'session3',
      isReady: false,
      lastActivity: Date.now(),
      board: {
        ships: [],
        grid: [],
        shipsRemaining: 5
      }
    };
  });

  describe('Queue Management', () => {
    it('should add player to queue', () => {
      matchmakingService.addToQueue(mockPlayer1);
      
      const queueSize = matchmakingService.getQueueSize();
      expect(queueSize).toBe(1);
    });

    it('should remove player from queue', () => {
      matchmakingService.addToQueue(mockPlayer1);
      matchmakingService.addToQueue(mockPlayer2);
      
      matchmakingService.removeFromQueue('player1');
      
      const queueSize = matchmakingService.getQueueSize();
      expect(queueSize).toBe(1);
    });

    it('should not add same player twice', () => {
      matchmakingService.addToQueue(mockPlayer1);
      matchmakingService.addToQueue(mockPlayer1);
      
      const queueSize = matchmakingService.getQueueSize();
      expect(queueSize).toBe(1);
    });

    it('should handle removing non-existent player gracefully', () => {
      matchmakingService.addToQueue(mockPlayer1);
      
      expect(() => {
        matchmakingService.removeFromQueue('nonexistent');
      }).not.toThrow();
      
      const queueSize = matchmakingService.getQueueSize();
      expect(queueSize).toBe(1);
    });
  });

  describe('Match Creation', () => {
    it('should create match when two players in queue', () => {
      matchmakingService.addToQueue(mockPlayer1);
      matchmakingService.addToQueue(mockPlayer2);
      
      const match = matchmakingService.attemptMatch();
      
      expect(match).toBeDefined();
      expect(match?.players).toHaveLength(2);
      expect(match?.players[0].id).toBe('player1');
      expect(match?.players[1].id).toBe('player2');
    });

    it('should not create match with single player', () => {
      matchmakingService.addToQueue(mockPlayer1);
      
      const match = matchmakingService.attemptMatch();
      
      expect(match).toBeNull();
      expect(matchmakingService.getQueueSize()).toBe(1);
    });

    it('should remove matched players from queue', () => {
      matchmakingService.addToQueue(mockPlayer1);
      matchmakingService.addToQueue(mockPlayer2);
      matchmakingService.addToQueue(mockPlayer3);
      
      const match = matchmakingService.attemptMatch();
      
      expect(match).toBeDefined();
      expect(matchmakingService.getQueueSize()).toBe(1); // One player left
    });

    it('should respect first-come-first-served order', () => {
      const firstPlayer = { ...mockPlayer1, id: 'first' };
      const secondPlayer = { ...mockPlayer2, id: 'second' };
      const thirdPlayer = { ...mockPlayer3, id: 'third' };
      
      matchmakingService.addToQueue(firstPlayer);
      matchmakingService.addToQueue(secondPlayer);
      matchmakingService.addToQueue(thirdPlayer);
      
      const match = matchmakingService.attemptMatch();
      
      expect(match?.players[0].id).toBe('first');
      expect(match?.players[1].id).toBe('second');
    });
  });

  describe('Queue Cleanup', () => {
    it('should remove inactive players from queue', () => {
      const oldTimestamp = Date.now() - 120000; // 2 minutes ago
      const inactivePlayer = {
        ...mockPlayer1,
        lastActivity: oldTimestamp
      };
      
      matchmakingService.addToQueue(inactivePlayer);
      matchmakingService.addToQueue(mockPlayer2);
      
      matchmakingService.cleanupInactivePlayers(60000); // 1 minute timeout
      
      expect(matchmakingService.getQueueSize()).toBe(1);
    });

    it('should keep active players in queue', () => {
      matchmakingService.addToQueue(mockPlayer1);
      matchmakingService.addToQueue(mockPlayer2);
      
      matchmakingService.cleanupInactivePlayers(60000); // 1 minute timeout
      
      expect(matchmakingService.getQueueSize()).toBe(2);
    });
  });

  describe('Game ID Generation', () => {
    it('should generate unique game IDs', () => {
      matchmakingService.addToQueue(mockPlayer1);
      matchmakingService.addToQueue(mockPlayer2);
      const match1 = matchmakingService.attemptMatch();
      
      matchmakingService.addToQueue(mockPlayer3);
      const anotherPlayer = { ...mockPlayer1, id: 'player4', sessionId: 'session4' };
      matchmakingService.addToQueue(anotherPlayer);
      const match2 = matchmakingService.attemptMatch();
      
      expect(match1?.id).toBeDefined();
      expect(match2?.id).toBeDefined();
      expect(match1?.id).not.toBe(match2?.id);
    });

    it('should create games in placement phase', () => {
      matchmakingService.addToQueue(mockPlayer1);
      matchmakingService.addToQueue(mockPlayer2);
      
      const match = matchmakingService.attemptMatch();
      
      expect(match?.phase).toBe('placement');
    });

    it('should set first player as current player', () => {
      matchmakingService.addToQueue(mockPlayer1);
      matchmakingService.addToQueue(mockPlayer2);
      
      const match = matchmakingService.attemptMatch();
      
      expect(match?.currentPlayerId).toBe('player1');
    });
  });
});