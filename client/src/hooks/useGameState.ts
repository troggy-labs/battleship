import { useState, useCallback, useMemo } from 'react';
import { Game, Player, Ship, Position, GamePhase, CellState } from '../../../shared/types';

interface UseGameStateReturn {
  game: Game | null;
  playerId: string | null;
  isMyTurn: boolean;
  gamePhase: GamePhase;
  setGame: (game: Game | null) => void;
  setPlayerId: (playerId: string | null) => void;
  getCurrentPlayer: () => Player | null;
  getOpponent: () => Player | null;
  updateShipPlacement: (shipId: string, ship: Ship) => void;
  updateCellState: (position: Position, state: CellState, targetPlayerId: string) => void;
  decrementShipsRemaining: (targetPlayerId: string) => void;
  areAllShipsPlaced: () => boolean;
  isWinner: () => boolean;
  getTurnTimeRemaining: (gameState?: Game) => number;
}

export const useGameState = (): UseGameStateReturn => {
  const [game, setGame] = useState<Game | null>(null);
  const [playerId, setPlayerId] = useState<string | null>(null);

  const isMyTurn = useMemo(() => {
    return game?.currentPlayerId === playerId && game?.phase === 'playing';
  }, [game?.currentPlayerId, playerId, game?.phase]);

  const gamePhase = useMemo(() => {
    return game?.phase || 'waiting';
  }, [game?.phase]);

  const getCurrentPlayer = useCallback((): Player | null => {
    if (!game || !playerId) return null;
    return game.players.find(p => p.id === playerId) || null;
  }, [game, playerId]);

  const getOpponent = useCallback((): Player | null => {
    if (!game || !playerId) return null;
    return game.players.find(p => p.id !== playerId) || null;
  }, [game, playerId]);

  const updateShipPlacement = useCallback((shipId: string, updatedShip: Ship) => {
    if (!game || !playerId) return;

    setGame(prevGame => {
      if (!prevGame) return prevGame;

      const updatedGame = { ...prevGame };
      const playerIndex = updatedGame.players.findIndex(p => p.id === playerId);
      
      if (playerIndex === -1) return prevGame;

      // Update the player's ships
      updatedGame.players[playerIndex] = {
        ...updatedGame.players[playerIndex],
        board: {
          ...updatedGame.players[playerIndex].board,
          ships: updatedGame.players[playerIndex].board.ships.map(ship =>
            ship.id === shipId ? updatedShip : ship
          )
        }
      };

      return updatedGame;
    });
  }, [game, playerId]);

  const updateCellState = useCallback((position: Position, state: CellState, targetPlayerId: string) => {
    if (!game) return;

    setGame(prevGame => {
      if (!prevGame) return prevGame;

      const updatedGame = { ...prevGame };
      const playerIndex = updatedGame.players.findIndex(p => p.id === targetPlayerId);
      
      if (playerIndex === -1) return prevGame;

      // Check if board exists
      if (!updatedGame.players[playerIndex].board || !updatedGame.players[playerIndex].board.grid) {
        return prevGame;
      }

      // Create a deep copy of the board
      const updatedBoard = {
        ...updatedGame.players[playerIndex].board,
        grid: updatedGame.players[playerIndex].board.grid.map(row =>
          row.map(cell => ({ ...cell }))
        )
      };

      // Update the specific cell
      updatedBoard.grid[position.row][position.col].state = state;

      updatedGame.players[playerIndex] = {
        ...updatedGame.players[playerIndex],
        board: updatedBoard
      };

      return updatedGame;
    });
  }, [game]);

  const decrementShipsRemaining = useCallback((targetPlayerId: string) => {
    if (!game) return;

    setGame(prevGame => {
      if (!prevGame) return prevGame;

      const updatedGame = { ...prevGame };
      const playerIndex = updatedGame.players.findIndex(p => p.id === targetPlayerId);
      
      if (playerIndex === -1) return prevGame;

      updatedGame.players[playerIndex] = {
        ...updatedGame.players[playerIndex],
        board: {
          ...updatedGame.players[playerIndex].board,
          shipsRemaining: Math.max(0, updatedGame.players[playerIndex].board.shipsRemaining - 1)
        }
      };

      return updatedGame;
    });
  }, [game]);

  const areAllShipsPlaced = useCallback((): boolean => {
    const currentPlayer = getCurrentPlayer();
    if (!currentPlayer) return false;

    return currentPlayer.board.ships.every(ship => ship.isPlaced);
  }, [getCurrentPlayer]);

  const isWinner = useCallback((): boolean => {
    if (!game || game.phase !== 'finished' || !playerId) return false;
    return game.winner === playerId;
  }, [game, playerId]);

  const getTurnTimeRemaining = useCallback((gameState?: Game): number => {
    const currentGame = gameState || game;
    if (!currentGame || !currentGame.turnStartTime || currentGame.phase !== 'playing') return 0;

    const elapsed = Date.now() - currentGame.turnStartTime;
    const remaining = Math.max(0, currentGame.turnTimer - elapsed);
    return remaining;
  }, [game]);

  return {
    game,
    playerId,
    isMyTurn,
    gamePhase,
    setGame,
    setPlayerId,
    getCurrentPlayer,
    getOpponent,
    updateShipPlacement,
    updateCellState,
    decrementShipsRemaining,
    areAllShipsPlaced,
    isWinner,
    getTurnTimeRemaining
  };
};