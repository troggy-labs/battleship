import { Game, Player, Position, Ship } from '../../../shared/types.js';
import { GameLogic } from '../controllers/gameLogic.js';
import { generatePlayerId, createEmptyBoard, createDefaultShips, areAllShipsPlaced } from '../../../shared/utils.js';

export class GameService {
  private games = new Map<string, Game>();
  private gameLogic = new GameLogic();

  createGame(game: Game): Game {
    this.games.set(game.id, game);
    return game;
  }

  getGame(gameId: string): Game | null {
    return this.games.get(gameId) || null;
  }

  async placeShip(
    gameId: string, 
    playerId: string, 
    shipId: string, 
    positions: Position[]
  ): Promise<{ success: boolean; ship?: Ship; error?: string }> {
    const game = this.getGame(gameId);
    if (!game) {
      return { success: false, error: 'Game not found' };
    }

    const player = game.players.find(p => p.id === playerId);
    if (!player) {
      return { success: false, error: 'Player not found' };
    }

    if (game.phase !== 'placement') {
      return { success: false, error: 'Ship placement not allowed in current game phase' };
    }

    const ship = player.board.ships.find(s => s.id === shipId);
    if (!ship) {
      return { success: false, error: 'Ship not found' };
    }

    // Validate placement (empty positions means removing ship)
    if (positions.length === 0) {
      this.gameLogic.removeShipFromBoard(player, ship);
      return { success: true, ship };
    }

    const validation = this.gameLogic.canPlaceShip(player.board.grid, ship, positions);
    if (!validation.isValid) {
      return { success: false, error: validation.error };
    }

    // Place ship
    this.gameLogic.placeShipOnBoard(player, ship, positions);

    return { success: true, ship };
  }

  async setPlayerReady(gameId: string, playerId: string): Promise<Game | null> {
    const game = this.getGame(gameId);
    if (!game) return null;

    const player = game.players.find(p => p.id === playerId);
    if (!player) return null;

    if (game.phase !== 'placement') return game;

    // Check if all ships are placed before allowing ready
    if (!areAllShipsPlaced(player.board.ships)) {
      return game;
    }

    player.isReady = true;

    // Check if both players are ready
    if (game.players.every(p => p.isReady)) {
      game.phase = 'playing';
      game.turnStartTime = Date.now();
    }

    return game;
  }

  async fireShot(
    gameId: string, 
    playerId: string, 
    position: Position
  ): Promise<{ success: boolean; result?: 'hit' | 'miss' | 'sunk'; position?: Position; shipSunk?: Ship; gameOver?: boolean; winner?: string; error?: string }> {
    const game = this.getGame(gameId);
    if (!game) {
      return { success: false, error: 'Game not found' };
    }

    const validation = this.gameLogic.canFireShot(game, playerId, position);
    if (!validation.isValid) {
      return { success: false, error: validation.error };
    }

    const shotResult = this.gameLogic.processShot(game, playerId, position);

    // Switch turn if not game over
    if (!shotResult.gameOver) {
      this.gameLogic.switchTurn(game);
    }

    return {
      success: true,
      result: shotResult.result,
      position,
      shipSunk: shotResult.shipSunk,
      gameOver: shotResult.gameOver,
      winner: shotResult.winner
    };
  }

  async reconnectPlayer(gameId: string, playerId: string, newSessionId: string): Promise<Game | null> {
    const game = this.getGame(gameId);
    if (!game) return null;

    const player = game.players.find(p => p.id === playerId);
    if (!player) return null;

    // Update session ID for reconnection
    player.sessionId = newSessionId;
    player.lastActivity = Date.now();

    return game;
  }

  async handlePlayerDisconnect(gameId: string, playerId: string): Promise<void> {
    const game = this.getGame(gameId);
    if (!game) return;

    const player = game.players.find(p => p.id === playerId);
    if (!player) return;

    // Mark player as inactive but keep game running
    // Game cleanup will be handled by timeout mechanisms
    player.lastActivity = Date.now() - 70000; // Mark as disconnected
  }

  cleanupInactiveGames(timeoutMs: number = 120000): void { // 2 minutes
    const now = Date.now();
    const gamesToRemove: string[] = [];

    for (const [gameId, game] of this.games.entries()) {
      const hasInactivePlayers = game.players.some(player => {
        const timeSinceActivity = now - player.lastActivity;
        return timeSinceActivity > timeoutMs;
      });

      if (hasInactivePlayers || (now - game.createdAt > 3600000)) { // Also cleanup games older than 1 hour
        gamesToRemove.push(gameId);
      }
    }

    gamesToRemove.forEach(gameId => {
      this.games.delete(gameId);
    });
  }

  handleTurnTimeout(gameId: string): Game | null {
    const game = this.getGame(gameId);
    if (!game) return null;

    if (this.gameLogic.isTurnTimedOut(game)) {
      // Auto-switch turn on timeout
      this.gameLogic.switchTurn(game);
    }

    return game;
  }

  getActiveGamesCount(): number {
    return this.games.size;
  }

  createPlayer(sessionId: string): Player {
    return {
      id: generatePlayerId(),
      sessionId,
      isReady: false,
      lastActivity: Date.now(),
      board: {
        ships: createDefaultShips(),
        grid: createEmptyBoard(),
        shipsRemaining: 5
      }
    };
  }

  updatePlayerActivity(gameId: string, playerId: string): void {
    const game = this.getGame(gameId);
    if (!game) return;

    const player = game.players.find(p => p.id === playerId);
    if (player) {
      player.lastActivity = Date.now();
    }
  }

  endGame(gameId: string, winner: string, reason: 'victory' | 'timeout' | 'disconnect'): Game | null {
    const game = this.getGame(gameId);
    if (!game) return null;

    game.phase = 'finished';
    game.winner = winner;

    // Game will be cleaned up by cleanup routine
    return game;
  }

  deleteGame(gameId: string): void {
    this.games.delete(gameId);
  }
}