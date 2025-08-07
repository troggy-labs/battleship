import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useGameState } from '../../hooks/useGameState';
import { Game, Player, Ship } from '../../../../shared/types';

describe('useGameState', () => {
  const createMockGame = (): Game => ({
    id: 'game123',
    players: [
      {
        id: 'player1',
        sessionId: 'session1',
        isReady: false,
        lastActivity: Date.now(),
        board: {
          ships: [],
          grid: Array(10).fill(null).map((_, row) =>
            Array(10).fill(null).map((_, col) => ({
              position: { row, col },
              state: 'empty' as const
            }))
          ),
          shipsRemaining: 5
        }
      },
      {
        id: 'player2',
        sessionId: 'session2',
        isReady: false,
        lastActivity: Date.now(),
        board: {
          ships: [],
          grid: Array(10).fill(null).map((_, row) =>
            Array(10).fill(null).map((_, col) => ({
              position: { row, col },
              state: 'empty' as const
            }))
          ),
          shipsRemaining: 5
        }
      }
    ],
    currentPlayerId: 'player1',
    phase: 'placement',
    createdAt: Date.now(),
    turnTimer: 60000
  });

  it('should initialize with default state', () => {
    const { result } = renderHook(() => useGameState());

    expect(result.current.game).toBeNull();
    expect(result.current.playerId).toBeNull();
    expect(result.current.isMyTurn).toBe(false);
    expect(result.current.gamePhase).toBe('waiting');
  });

  it('should update game state', () => {
    const { result } = renderHook(() => useGameState());
    const mockGame = createMockGame();

    act(() => {
      result.current.setGame(mockGame);
      result.current.setPlayerId('player1');
    });

    expect(result.current.game).toEqual(mockGame);
    expect(result.current.playerId).toBe('player1');
    expect(result.current.gamePhase).toBe('placement');
  });

  it('should correctly determine if it is player turn', () => {
    const { result } = renderHook(() => useGameState());
    const mockGame = createMockGame();
    mockGame.phase = 'playing';
    mockGame.currentPlayerId = 'player1';

    act(() => {
      result.current.setGame(mockGame);
      result.current.setPlayerId('player1');
    });

    expect(result.current.isMyTurn).toBe(true);

    act(() => {
      result.current.setPlayerId('player2');
    });

    expect(result.current.isMyTurn).toBe(false);
  });

  it('should get current player correctly', () => {
    const { result } = renderHook(() => useGameState());
    const mockGame = createMockGame();

    act(() => {
      result.current.setGame(mockGame);
      result.current.setPlayerId('player1');
    });

    const currentPlayer = result.current.getCurrentPlayer();
    expect(currentPlayer?.id).toBe('player1');
  });

  it('should get opponent correctly', () => {
    const { result } = renderHook(() => useGameState());
    const mockGame = createMockGame();

    act(() => {
      result.current.setGame(mockGame);
      result.current.setPlayerId('player1');
    });

    const opponent = result.current.getOpponent();
    expect(opponent?.id).toBe('player2');
  });

  it('should update ship placement', () => {
    const { result } = renderHook(() => useGameState());
    const mockGame = createMockGame();
    
    act(() => {
      result.current.setGame(mockGame);
      result.current.setPlayerId('player1');
    });

    const newShip: Ship = {
      id: 'destroyer1',
      type: 'destroyer',
      size: 2,
      positions: [{ row: 0, col: 0 }, { row: 0, col: 1 }],
      isPlaced: true,
      isSunk: false
    };

    act(() => {
      result.current.updateShipPlacement('destroyer1', newShip);
    });

    const currentPlayer = result.current.getCurrentPlayer();
    const updatedShip = currentPlayer?.board.ships.find(s => s.id === 'destroyer1');
    expect(updatedShip).toEqual(newShip);
  });

  it('should update board cell state', () => {
    const { result } = renderHook(() => useGameState());
    const mockGame = createMockGame();
    
    act(() => {
      result.current.setGame(mockGame);
      result.current.setPlayerId('player1');
    });

    act(() => {
      result.current.updateCellState({ row: 5, col: 5 }, 'hit', 'player1');
    });

    const currentPlayer = result.current.getCurrentPlayer();
    const cell = currentPlayer?.board.grid[5][5];
    expect(cell?.state).toBe('hit');
  });

  it('should track ships remaining', () => {
    const { result } = renderHook(() => useGameState());
    const mockGame = createMockGame();
    
    act(() => {
      result.current.setGame(mockGame);
      result.current.setPlayerId('player1');
    });

    act(() => {
      result.current.decrementShipsRemaining('player1');
    });

    const currentPlayer = result.current.getCurrentPlayer();
    expect(currentPlayer?.board.shipsRemaining).toBe(4);
  });

  it('should check if all ships are placed', () => {
    const { result } = renderHook(() => useGameState());
    const mockGame = createMockGame();

    // Add 5 ships, all placed
    const ships: Ship[] = [
      { id: 'ship1', type: 'carrier', size: 5, positions: [], isPlaced: true, isSunk: false },
      { id: 'ship2', type: 'battleship', size: 4, positions: [], isPlaced: true, isSunk: false },
      { id: 'ship3', type: 'cruiser', size: 3, positions: [], isPlaced: true, isSunk: false },
      { id: 'ship4', type: 'submarine', size: 3, positions: [], isPlaced: true, isSunk: false },
      { id: 'ship5', type: 'destroyer', size: 2, positions: [], isPlaced: true, isSunk: false }
    ];

    mockGame.players[0].board.ships = ships;

    act(() => {
      result.current.setGame(mockGame);
      result.current.setPlayerId('player1');
    });

    expect(result.current.areAllShipsPlaced()).toBe(true);
  });

  it('should check if not all ships are placed', () => {
    const { result } = renderHook(() => useGameState());
    const mockGame = createMockGame();

    // Add 5 ships, only 3 placed
    const ships: Ship[] = [
      { id: 'ship1', type: 'carrier', size: 5, positions: [], isPlaced: true, isSunk: false },
      { id: 'ship2', type: 'battleship', size: 4, positions: [], isPlaced: true, isSunk: false },
      { id: 'ship3', type: 'cruiser', size: 3, positions: [], isPlaced: true, isSunk: false },
      { id: 'ship4', type: 'submarine', size: 3, positions: [], isPlaced: false, isSunk: false },
      { id: 'ship5', type: 'destroyer', size: 2, positions: [], isPlaced: false, isSunk: false }
    ];

    mockGame.players[0].board.ships = ships;

    act(() => {
      result.current.setGame(mockGame);
      result.current.setPlayerId('player1');
    });

    expect(result.current.areAllShipsPlaced()).toBe(false);
  });

  it('should handle game over state', () => {
    const { result } = renderHook(() => useGameState());
    const mockGame = createMockGame();
    mockGame.phase = 'finished';
    mockGame.winner = 'player1';

    act(() => {
      result.current.setGame(mockGame);
      result.current.setPlayerId('player1');
    });

    expect(result.current.gamePhase).toBe('finished');
    expect(result.current.isWinner()).toBe(true);

    act(() => {
      result.current.setPlayerId('player2');
    });

    expect(result.current.isWinner()).toBe(false);
  });

  it('should calculate turn time remaining', () => {
    const { result } = renderHook(() => useGameState());
    const mockGame = createMockGame();
    mockGame.phase = 'playing';
    mockGame.turnStartTime = Date.now() - 30000; // 30 seconds ago
    mockGame.turnTimer = 60000; // 60 seconds total

    act(() => {
      result.current.setGame(mockGame);
    });

    const timeRemaining = result.current.getTurnTimeRemaining();
    expect(timeRemaining).toBeGreaterThanOrEqual(25000); // Should have ~30 seconds left
    expect(timeRemaining).toBeLessThanOrEqual(30000);
  });

  it('should handle undefined turn start time', () => {
    const { result } = renderHook(() => useGameState());
    const mockGame = createMockGame();
    mockGame.phase = 'playing';
    mockGame.turnStartTime = undefined;

    act(() => {
      result.current.setGame(mockGame);
    });

    const timeRemaining = result.current.getTurnTimeRemaining();
    expect(timeRemaining).toBe(0);
  });
});