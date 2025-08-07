import { Game, Player, Ship, Position, Board, ValidationResult } from '../../../shared/types';
import { 
  isValidPosition, 
  canPlaceShipAtPositions, 
  shipContainsPosition,
  isShipFullyHit,
  markShipAsSunk,
  positionsEqual
} from '../../../shared/utils';

export class GameLogic {
  canPlaceShip(board: Board, ship: Ship, positions: Position[]): ValidationResult {
    // Check if positions are valid
    if (!positions.every(pos => isValidPosition(pos))) {
      return {
        isValid: false,
        error: 'Ship placement outside board boundaries'
      };
    }

    // Check if positions match ship size
    if (positions.length !== ship.size) {
      return {
        isValid: false,
        error: `Ship requires ${ship.size} positions but ${positions.length} provided`
      };
    }

    // Check if positions are contiguous and in a straight line
    if (!this.arePositionsContiguous(positions)) {
      return {
        isValid: false,
        error: 'Ship positions must be contiguous and in a straight line'
      };
    }

    // Check if positions are available
    if (!canPlaceShipAtPositions(board, positions)) {
      return {
        isValid: false,
        error: 'Ship positions overlap with existing ships'
      };
    }

    return { isValid: true };
  }

  private arePositionsContiguous(positions: Position[]): boolean {
    if (positions.length <= 1) return true;

    // Sort positions to check contiguity
    const sortedPositions = [...positions].sort((a, b) => {
      if (a.row !== b.row) return a.row - b.row;
      return a.col - b.col;
    });

    // Check if horizontal
    const isHorizontal = sortedPositions.every(pos => pos.row === sortedPositions[0].row);
    if (isHorizontal) {
      for (let i = 1; i < sortedPositions.length; i++) {
        if (sortedPositions[i].col !== sortedPositions[i-1].col + 1) {
          return false;
        }
      }
      return true;
    }

    // Check if vertical
    const isVertical = sortedPositions.every(pos => pos.col === sortedPositions[0].col);
    if (isVertical) {
      for (let i = 1; i < sortedPositions.length; i++) {
        if (sortedPositions[i].row !== sortedPositions[i-1].row + 1) {
          return false;
        }
      }
      return true;
    }

    return false;
  }

  canFireShot(game: Game, playerId: string, position: Position): ValidationResult {
    if (game.phase !== 'playing') {
      return {
        isValid: false,
        error: 'Cannot fire shots during placement phase'
      };
    }

    if (game.currentPlayerId !== playerId) {
      return {
        isValid: false,
        error: 'It is not your turn'
      };
    }

    if (!isValidPosition(position)) {
      return {
        isValid: false,
        error: 'Shot position is outside board boundaries'
      };
    }

    // Get opponent's board
    const opponent = game.players.find(p => p.id !== playerId);
    if (!opponent) {
      return {
        isValid: false,
        error: 'Opponent not found'
      };
    }

    if (!opponent.board || !opponent.board.grid) {
      console.error('Opponent board or grid is undefined:', opponent.board);
      return {
        isValid: false,
        error: 'Opponent board not initialized'
      };
    }

    if (!opponent.board.grid[position.row]) {
      console.error('Board row is undefined:', position.row, 'Grid length:', opponent.board.grid.length);
      return {
        isValid: false,
        error: `Invalid board row: ${position.row}`
      };
    }

    const targetCell = opponent.board.grid[position.row][position.col];
    if (!targetCell) {
      return {
        isValid: false,
        error: `Invalid board position: ${position.row},${position.col}`
      };
    }
    
    if (targetCell.state === 'hit' || targetCell.state === 'miss' || targetCell.state === 'sunk') {
      return {
        isValid: false,
        error: 'Position has already been targeted'
      };
    }

    return { isValid: true };
  }

  isGameOver(game: Game): boolean {
    if (game.phase !== 'playing') return false;

    return game.players.some(player => player.board.shipsRemaining === 0);
  }

  isShipSunk(board: Board, ship: Ship): boolean {
    return isShipFullyHit(ship, board);
  }

  getNextPlayer(game: Game): string {
    const currentIndex = game.players.findIndex(p => p.id === game.currentPlayerId);
    const nextIndex = (currentIndex + 1) % game.players.length;
    return game.players[nextIndex].id;
  }

  isTurnTimedOut(game: Game): boolean {
    if (!game.turnStartTime) return false;
    
    const elapsed = Date.now() - game.turnStartTime;
    return elapsed > game.turnTimer;
  }

  processShot(game: Game, playerId: string, position: Position): {
    result: 'hit' | 'miss' | 'sunk';
    shipSunk?: Ship;
    gameOver: boolean;
    winner?: string;
  } {
    const opponent = game.players.find(p => p.id !== playerId)!;
    const targetCell = opponent.board.grid[position.row][position.col];

    // Check if shot hits a ship
    const hitShip = opponent.board.ships.find(ship => 
      shipContainsPosition(ship, position)
    );

    if (hitShip && targetCell.state === 'ship') {
      // Hit!
      targetCell.state = 'hit';
      
      // Check if ship is fully sunk
      if (this.isShipSunk(opponent.board.grid, hitShip)) {
        markShipAsSunk(hitShip, opponent.board.grid);
        opponent.board.shipsRemaining--;

        // Check if game is over
        const gameOver = opponent.board.shipsRemaining === 0;
        if (gameOver) {
          game.phase = 'finished';
          game.winner = playerId;
        }

        return {
          result: 'sunk',
          shipSunk: hitShip,
          gameOver,
          winner: gameOver ? playerId : undefined
        };
      }

      return {
        result: 'hit',
        gameOver: false
      };
    } else {
      // Miss
      targetCell.state = 'miss';
      return {
        result: 'miss',
        gameOver: false
      };
    }
  }

  switchTurn(game: Game): void {
    game.currentPlayerId = this.getNextPlayer(game);
    game.turnStartTime = Date.now();
  }

  placeShipOnBoard(player: Player, ship: Ship, positions: Position[]): void {
    // Remove ship from previous positions if already placed
    if (ship.isPlaced) {
      ship.positions.forEach(pos => {
        const cell = player.board.grid[pos.row][pos.col];
        if (cell.shipId === ship.id) {
          cell.state = 'empty';
          cell.shipId = undefined;
        }
      });
    }

    // Place ship at new positions
    ship.positions = positions;
    ship.isPlaced = true;

    positions.forEach(pos => {
      const cell = player.board.grid[pos.row][pos.col];
      cell.state = 'ship';
      cell.shipId = ship.id;
    });
  }

  removeShipFromBoard(player: Player, ship: Ship): void {
    if (!ship.isPlaced) return;

    ship.positions.forEach(pos => {
      const cell = player.board.grid[pos.row][pos.col];
      if (cell.shipId === ship.id) {
        cell.state = 'empty';
        cell.shipId = undefined;
      }
    });

    ship.positions = [];
    ship.isPlaced = false;
  }

  areAllShipsPlaced(player: Player): boolean {
    return player.board.ships.every(ship => ship.isPlaced);
  }

  getGameWinner(game: Game): string | null {
    if (game.phase !== 'finished') return null;
    return game.winner || null;
  }

  calculateTurnTimeRemaining(game: Game): number {
    if (!game.turnStartTime || game.phase !== 'playing') return 0;
    
    const elapsed = Date.now() - game.turnStartTime;
    const remaining = Math.max(0, game.turnTimer - elapsed);
    return remaining;
  }
}