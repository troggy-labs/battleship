import { Player, Game } from '../../../shared/types.js';
import { generateGameId, createEmptyBoard, createDefaultShips } from '../../../shared/utils.js';

export class MatchmakingService {
  private queue: Player[] = [];
  private readonly INACTIVE_TIMEOUT = 60000; // 1 minute

  addToQueue(player: Player): void {
    // Don't add if player already in queue
    if (this.queue.find(p => p.id === player.id)) {
      return;
    }

    this.queue.push(player);
  }

  removeFromQueue(playerId: string): void {
    this.queue = this.queue.filter(p => p.id !== playerId);
  }

  attemptMatch(): Game | null {
    if (this.queue.length < 2) {
      return null;
    }

    // Take first two players (FIFO)
    const player1 = this.queue.shift()!;
    const player2 = this.queue.shift()!;

    // Create game
    const game: Game = {
      id: generateGameId(),
      players: [player1, player2],
      currentPlayerId: player1.id,
      phase: 'placement',
      createdAt: Date.now(),
      turnTimer: 60000
    };

    // Initialize player boards
    game.players.forEach(player => {
      player.board.grid = createEmptyBoard();
      player.board.ships = createDefaultShips();
      player.board.shipsRemaining = 5;
    });

    return game;
  }

  getQueueSize(): number {
    return this.queue.length;
  }

  getQueuedPlayers(): Player[] {
    return [...this.queue];
  }

  cleanupInactivePlayers(timeoutMs: number = this.INACTIVE_TIMEOUT): void {
    const now = Date.now();
    this.queue = this.queue.filter(player => {
      const timeSinceLastActivity = now - player.lastActivity;
      return timeSinceLastActivity < timeoutMs;
    });
  }

  isPlayerInQueue(playerId: string): boolean {
    return this.queue.some(p => p.id === playerId);
  }

  updatePlayerActivity(playerId: string): void {
    const player = this.queue.find(p => p.id === playerId);
    if (player) {
      player.lastActivity = Date.now();
    }
  }

  getPlayerQueuePosition(playerId: string): number {
    return this.queue.findIndex(p => p.id === playerId);
  }

  clear(): void {
    this.queue = [];
  }
}