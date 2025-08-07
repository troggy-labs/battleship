import { Socket } from 'socket.io';
import { GameService } from '../services/gameService';
import { MatchmakingService } from '../services/matchmakingService';
import { BackgroundService } from '../services/backgroundService';
import { Position } from '../../../shared/types.js';

export class SocketHandlers {
  constructor(
    private gameService: GameService,
    private matchmakingService: MatchmakingService,
    private backgroundService: BackgroundService
  ) {}

  async handleJoinQueue(socket: Socket): Promise<void> {
    try {
      // Create player
      const player = this.gameService.createPlayer(socket.id);
      socket.data.playerId = player.id;

      // Add to matchmaking queue
      this.matchmakingService.addToQueue(player);
      socket.emit('queue-joined');

      // Try to find a match
      const match = this.matchmakingService.attemptMatch();
      if (match) {
        // Create game
        const game = this.gameService.createGame(match);

        // Generate background
        try {
          const backgroundUrl = await this.backgroundService.generateBackground(game.id);
          game.background = backgroundUrl;
        } catch (error) {
          console.warn('Failed to generate background for game', game.id, error);
        }

        // Notify both players
        for (const player of game.players) {
          const playerSocket = this.findSocketByPlayerId(player.id);
          if (playerSocket) {
            playerSocket.data.gameId = game.id;
            playerSocket.join(`game:${game.id}`);

            const opponent = game.players.find(p => p.id !== player.id);
            playerSocket.emit('game-found', {
              gameId: game.id,
              playerId: player.id,
              opponent: opponent ? {
                id: opponent.id,
                sessionId: opponent.sessionId,
                isReady: opponent.isReady,
                lastActivity: opponent.lastActivity
              } : null
            });

            // Send initial game state
            this.sendGameState(playerSocket, game, player.id);
          }
        }
      }
    } catch (error) {
      console.error('Error handling join queue:', error);
      socket.emit('error', 'Failed to join queue');
    }
  }

  async handleLeaveQueue(socket: Socket): Promise<void> {
    try {
      if (socket.data.playerId) {
        this.matchmakingService.removeFromQueue(socket.data.playerId);
      }
    } catch (error) {
      console.error('Error handling leave queue:', error);
    }
  }

  async handlePlaceShip(socket: Socket, data: { shipId: string; positions: Position[] }): Promise<void> {
    try {
      const { gameId, playerId } = socket.data;
      if (!gameId || !playerId) {
        socket.emit('error', 'No active game');
        return;
      }

      const result = await this.gameService.placeShip(gameId, playerId, data.shipId, data.positions);
      
      if (result.success) {
        socket.emit('ship-placed', {
          ship: result.ship,
          isValid: true
        });

        // Update player activity
        this.gameService.updatePlayerActivity(gameId, playerId);

        // Broadcast updated game state to both players
        const game = this.gameService.getGame(gameId);
        if (game) {
          this.broadcastGameState(game);
        }
      } else {
        socket.emit('ship-placed', {
          ship: undefined,
          isValid: false,
          error: result.error
        });
      }
    } catch (error) {
      console.error('Error handling place ship:', error);
      socket.emit('error', 'Failed to place ship');
    }
  }

  async handleReadyToPlay(socket: Socket): Promise<void> {
    try {
      const { gameId, playerId } = socket.data;
      if (!gameId || !playerId) {
        socket.emit('error', 'No active game');
        return;
      }

      const game = await this.gameService.setPlayerReady(gameId, playerId);
      if (game) {
        this.gameService.updatePlayerActivity(gameId, playerId);
        this.broadcastGameState(game);

        // If game phase changed to playing, start turn timer
        if (game.phase === 'playing') {
          this.startTurnTimer(game);
        }
      }
    } catch (error) {
      console.error('Error handling ready to play:', error);
      socket.emit('error', 'Failed to set ready status');
    }
  }

  async handleFireShot(socket: Socket, position: Position): Promise<void> {
    try {
      const { gameId, playerId } = socket.data;
      if (!gameId || !playerId) {
        socket.emit('error', 'No active game');
        return;
      }

      console.log('Fire shot request:', { gameId, playerId, position });
      const result = await this.gameService.fireShot(gameId, playerId, position);
      
      if (result.success) {
        // Update player activity
        this.gameService.updatePlayerActivity(gameId, playerId);

        // Send shot result to both players
        socket.to(`game:${gameId}`).emit('shot-result', {
          position: result.position,
          result: result.result,
          shipSunk: result.shipSunk,
          gameOver: result.gameOver,
          shooter: playerId
        });

        socket.emit('shot-result', {
          position: result.position,
          result: result.result,
          shipSunk: result.shipSunk,
          gameOver: result.gameOver,
          shooter: playerId
        });

        // Broadcast updated game state
        const game = this.gameService.getGame(gameId);
        if (game) {
          this.broadcastGameState(game);

          if (result.gameOver) {
            // Game ended
            socket.to(`game:${gameId}`).emit('game-ended', {
              winner: result.winner,
              reason: 'victory'
            });
            socket.emit('game-ended', {
              winner: result.winner,
              reason: 'victory'
            });
          } else {
            // Continue with turn timer
            this.startTurnTimer(game);
          }
        }
      } else {
        console.error('Shot validation failed:', result.error);
        socket.emit('error', result.error || 'Failed to fire shot');
      }
    } catch (error) {
      console.error('Error handling fire shot:', error);
      socket.emit('error', 'Failed to fire shot');
    }
  }

  async handleReconnectGame(socket: Socket, gameId: string): Promise<void> {
    try {
      const game = this.gameService.getGame(gameId);
      if (!game) {
        socket.emit('error', 'Game not found');
        return;
      }

      // Find player by matching session or allowing reconnection
      let player = game.players.find(p => p.sessionId === socket.id);
      if (!player) {
        // Try to find disconnected player (by checking activity)
        player = game.players.find(p => Date.now() - p.lastActivity > 30000);
      }

      if (!player) {
        socket.emit('error', 'Cannot reconnect to this game');
        return;
      }

      // Reconnect player
      const reconnectedGame = await this.gameService.reconnectPlayer(gameId, player.id, socket.id);
      if (reconnectedGame) {
        socket.data.gameId = gameId;
        socket.data.playerId = player.id;
        socket.join(`game:${gameId}`);

        // Notify other player
        socket.to(`game:${gameId}`).emit('player-reconnected');
        
        // Send current game state
        this.sendGameState(socket, reconnectedGame, player.id);
      }
    } catch (error) {
      console.error('Error handling reconnect game:', error);
      socket.emit('error', 'Failed to reconnect');
    }
  }

  async handleDisconnect(socket: Socket): Promise<void> {
    try {
      const { gameId, playerId } = socket.data;

      if (gameId && playerId) {
        // Handle game disconnect
        await this.gameService.handlePlayerDisconnect(gameId, playerId);
        
        // Notify other player
        socket.to(`game:${gameId}`).emit('player-disconnected');
      } else if (playerId) {
        // Remove from matchmaking queue
        this.matchmakingService.removeFromQueue(playerId);
      }
    } catch (error) {
      console.error('Error handling disconnect:', error);
    }
  }

  private sendGameState(socket: Socket, game: any, playerId: string): void {
    const player = game.players.find((p: any) => p.id === playerId);
    const opponent = game.players.find((p: any) => p.id !== playerId);

    if (!player || !opponent) return;

    socket.emit('game-state', {
      id: game.id,
      currentPlayerId: game.currentPlayerId,
      phase: game.phase,
      winner: game.winner,
      background: game.background,
      createdAt: game.createdAt,
      turnTimer: game.turnTimer,
      turnStartTime: game.turnStartTime,
      player: player,
      opponent: {
        id: opponent.id,
        sessionId: opponent.sessionId,
        isReady: opponent.isReady,
        lastActivity: opponent.lastActivity,
        board: opponent.board
      }
    });
  }

  private broadcastGameState(game: any): void {
    for (const player of game.players) {
      const playerSocket = this.findSocketByPlayerId(player.id);
      if (playerSocket) {
        this.sendGameState(playerSocket, game, player.id);
      }
    }
  }

  private findSocketByPlayerId(playerId: string): Socket | null {
    // This would need to be implemented with a socket registry
    // For now, we'll assume the socket is stored in the game service
    return null; // Placeholder
  }

  private startTurnTimer(game: any): void {
    // Set up turn timer
    setTimeout(() => {
      const currentGame = this.gameService.getGame(game.id);
      if (currentGame && currentGame.phase === 'playing') {
        const timedOutGame = this.gameService.handleTurnTimeout(game.id);
        if (timedOutGame) {
          this.broadcastGameState(timedOutGame);
          
          // Notify about turn change
          for (const player of timedOutGame.players) {
            const playerSocket = this.findSocketByPlayerId(player.id);
            if (playerSocket) {
              playerSocket.emit('turn-changed', {
                currentPlayerId: timedOutGame.currentPlayerId,
                timeRemaining: timedOutGame.turnTimer
              });
            }
          }
        }
      }
    }, game.turnTimer);
  }
}