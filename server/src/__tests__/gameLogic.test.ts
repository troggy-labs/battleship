import { describe, it, expect, beforeEach } from 'vitest';
import { GameLogic } from '../controllers/gameLogic';
import { Game, Player, Ship, Position, SHIP_SIZES } from '../../../shared/types';

describe('GameLogic', () => {
  let gameLogic: GameLogic;
  let mockGame: Game;
  let mockPlayer1: Player;
  let mockPlayer2: Player;

  beforeEach(() => {
    gameLogic = new GameLogic();
    
    mockPlayer1 = {
      id: 'player1',
      sessionId: 'session1',
      isReady: false,
      lastActivity: Date.now(),
      board: {
        ships: [],
        grid: Array(10).fill(null).map(() => 
          Array(10).fill(null).map((_, col) => 
            Array(10).fill(null).map((_, row) => ({
              position: { row, col },
              state: 'empty' as const
            }))
          ).flat()
        ).flat(),
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
        grid: Array(10).fill(null).map(() => 
          Array(10).fill(null).map((_, col) => 
            Array(10).fill(null).map((_, row) => ({
              position: { row, col },
              state: 'empty' as const
            }))
          ).flat()
        ).flat(),
        shipsRemaining: 5
      }
    };

    mockGame = {
      id: 'game1',
      players: [mockPlayer1, mockPlayer2],
      currentPlayerId: 'player1',
      phase: 'placement',
      createdAt: Date.now(),
      turnTimer: 60000
    };
  });

  describe('Ship Placement', () => {
    it('should validate valid ship placement', () => {
      const ship: Ship = {
        id: 'ship1',
        type: 'destroyer',
        size: 2,
        positions: [],
        isPlaced: false,
        isSunk: false
      };

      const positions: Position[] = [
        { row: 0, col: 0 },
        { row: 0, col: 1 }
      ];

      const result = gameLogic.canPlaceShip(mockPlayer1.board.grid, ship, positions);
      expect(result.isValid).toBe(true);
    });

    it('should reject ship placement outside board boundaries', () => {
      const ship: Ship = {
        id: 'ship1',
        type: 'destroyer',
        size: 2,
        positions: [],
        isPlaced: false,
        isSunk: false
      };

      const positions: Position[] = [
        { row: 9, col: 9 },
        { row: 9, col: 10 } // Outside board
      ];

      const result = gameLogic.canPlaceShip(mockPlayer1.board.grid, ship, positions);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('outside board');
    });

    it('should reject overlapping ship placement', () => {
      // Place first ship
      const existingShip: Ship = {
        id: 'ship1',
        type: 'destroyer',
        size: 2,
        positions: [{ row: 0, col: 0 }, { row: 0, col: 1 }],
        isPlaced: true,
        isSunk: false
      };
      
      mockPlayer1.board.ships.push(existingShip);
      mockPlayer1.board.grid[0][0].state = 'ship';
      mockPlayer1.board.grid[0][1].state = 'ship';

      const newShip: Ship = {
        id: 'ship2',
        type: 'cruiser',
        size: 3,
        positions: [],
        isPlaced: false,
        isSunk: false
      };

      const positions: Position[] = [
        { row: 0, col: 1 }, // Overlaps with existing ship
        { row: 0, col: 2 },
        { row: 0, col: 3 }
      ];

      const result = gameLogic.canPlaceShip(mockPlayer1.board.grid, newShip, positions);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('overlap');
    });

    it('should validate all standard ships can be placed', () => {
      const shipTypes = Object.keys(SHIP_SIZES) as Array<keyof typeof SHIP_SIZES>;
      
      shipTypes.forEach(shipType => {
        const ship: Ship = {
          id: `${shipType}-1`,
          type: shipType,
          size: SHIP_SIZES[shipType],
          positions: [],
          isPlaced: false,
          isSunk: false
        };

        // Create horizontal positions
        const positions: Position[] = [];
        for (let i = 0; i < ship.size; i++) {
          positions.push({ row: 0, col: i });
        }

        const result = gameLogic.canPlaceShip(mockPlayer1.board.grid, ship, positions);
        expect(result.isValid).toBe(true);
      });
    });
  });

  describe('Shot Validation', () => {
    it('should allow valid shots', () => {
      mockGame.phase = 'playing';
      const position: Position = { row: 5, col: 5 };

      const result = gameLogic.canFireShot(mockGame, 'player1', position);
      expect(result.isValid).toBe(true);
    });

    it('should reject shots when not player turn', () => {
      mockGame.phase = 'playing';
      mockGame.currentPlayerId = 'player1';
      const position: Position = { row: 5, col: 5 };

      const result = gameLogic.canFireShot(mockGame, 'player2', position);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('not your turn');
    });

    it('should reject shots during placement phase', () => {
      mockGame.phase = 'placement';
      const position: Position = { row: 5, col: 5 };

      const result = gameLogic.canFireShot(mockGame, 'player1', position);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('placement phase');
    });

    it('should reject shots at already targeted positions', () => {
      mockGame.phase = 'playing';
      const position: Position = { row: 5, col: 5 };
      
      // Mark position as already hit
      const opponent = mockGame.players.find(p => p.id !== 'player1')!;
      opponent.board.grid[5][5].state = 'hit';

      const result = gameLogic.canFireShot(mockGame, 'player1', position);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('already targeted');
    });
  });

  describe('Game State Management', () => {
    it('should detect game over when all ships sunk', () => {
      mockGame.phase = 'playing';
      mockPlayer2.board.shipsRemaining = 0;

      const isOver = gameLogic.isGameOver(mockGame);
      expect(isOver).toBe(true);
    });

    it('should not detect game over during placement', () => {
      mockGame.phase = 'placement';
      mockPlayer2.board.shipsRemaining = 0;

      const isOver = gameLogic.isGameOver(mockGame);
      expect(isOver).toBe(false);
    });

    it('should not detect game over when ships remain', () => {
      mockGame.phase = 'playing';
      mockPlayer1.board.shipsRemaining = 3;
      mockPlayer2.board.shipsRemaining = 2;

      const isOver = gameLogic.isGameOver(mockGame);
      expect(isOver).toBe(false);
    });
  });

  describe('Ship Sinking Logic', () => {
    it('should detect when ship is sunk', () => {
      const ship: Ship = {
        id: 'destroyer1',
        type: 'destroyer',
        size: 2,
        positions: [{ row: 0, col: 0 }, { row: 0, col: 1 }],
        isPlaced: true,
        isSunk: false
      };

      mockPlayer1.board.ships.push(ship);
      mockPlayer1.board.grid[0][0].state = 'hit';
      mockPlayer1.board.grid[0][0].shipId = 'destroyer1';
      mockPlayer1.board.grid[0][1].state = 'hit';
      mockPlayer1.board.grid[0][1].shipId = 'destroyer1';

      const isSunk = gameLogic.isShipSunk(mockPlayer1.board, ship);
      expect(isSunk).toBe(true);
    });

    it('should not detect ship as sunk when partially hit', () => {
      const ship: Ship = {
        id: 'destroyer1',
        type: 'destroyer',
        size: 2,
        positions: [{ row: 0, col: 0 }, { row: 0, col: 1 }],
        isPlaced: true,
        isSunk: false
      };

      mockPlayer1.board.ships.push(ship);
      mockPlayer1.board.grid[0][0].state = 'hit';
      mockPlayer1.board.grid[0][0].shipId = 'destroyer1';
      mockPlayer1.board.grid[0][1].state = 'ship'; // Not hit yet
      mockPlayer1.board.grid[0][1].shipId = 'destroyer1';

      const isSunk = gameLogic.isShipSunk(mockPlayer1.board, ship);
      expect(isSunk).toBe(false);
    });
  });

  describe('Turn Management', () => {
    it('should switch turns after shot', () => {
      mockGame.currentPlayerId = 'player1';
      
      const nextPlayer = gameLogic.getNextPlayer(mockGame);
      expect(nextPlayer).toBe('player2');
    });

    it('should handle turn timeouts', () => {
      mockGame.turnStartTime = Date.now() - 70000; // 70 seconds ago
      mockGame.turnTimer = 60000; // 60 second limit

      const isTimedOut = gameLogic.isTurnTimedOut(mockGame);
      expect(isTimedOut).toBe(true);
    });

    it('should not timeout within turn limit', () => {
      mockGame.turnStartTime = Date.now() - 30000; // 30 seconds ago
      mockGame.turnTimer = 60000; // 60 second limit

      const isTimedOut = gameLogic.isTurnTimedOut(mockGame);
      expect(isTimedOut).toBe(false);
    });
  });
});