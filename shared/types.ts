// Game Types
export type CellState = 'empty' | 'ship' | 'hit' | 'miss' | 'sunk';

export type ShipType = 'carrier' | 'battleship' | 'cruiser' | 'submarine' | 'destroyer';

export interface Ship {
  id: string;
  type: ShipType;
  size: number;
  positions: Position[];
  isPlaced: boolean;
  isSunk: boolean;
}

export interface Position {
  row: number;
  col: number;
}

export interface Cell {
  position: Position;
  state: CellState;
  shipId?: string;
}

export type Board = Cell[][];

export interface GameBoard {
  ships: Ship[];
  grid: Board;
  shipsRemaining: number;
}

// Player Types
export interface Player {
  id: string;
  sessionId: string;
  nickname?: string;
  isReady: boolean;
  board: GameBoard;
  lastActivity: number;
}

// Game State Types
export type GamePhase = 'waiting' | 'placement' | 'playing' | 'finished';

export interface Game {
  id: string;
  players: [Player, Player];
  currentPlayerId: string;
  phase: GamePhase;
  winner?: string;
  background?: string;
  createdAt: number;
  turnTimer: number;
  turnStartTime?: number;
}

// WebSocket Event Types
export interface ClientEvents {
  'join-queue': () => void;
  'leave-queue': () => void;
  'place-ship': (data: { shipId: string; positions: Position[] }) => void;
  'ready-to-play': () => void;
  'fire-shot': (position: Position) => void;
  'reconnect-game': (gameId: string) => void;
}

export interface ServerEvents {
  'queue-joined': () => void;
  'game-found': (data: { gameId: string; playerId: string; opponent: Omit<Player, 'board'> }) => void;
  'game-state': (game: Omit<Game, 'players'> & { 
    player: Player; 
    opponent: Omit<Player, 'board'>;
  }) => void;
  'ship-placed': (data: { ship: Ship; isValid: boolean; error?: string }) => void;
  'shot-result': (data: { 
    position: Position; 
    result: 'hit' | 'miss' | 'sunk'; 
    shipSunk?: Ship;
    gameOver?: boolean;
  }) => void;
  'turn-changed': (data: { currentPlayerId: string; timeRemaining: number }) => void;
  'player-disconnected': () => void;
  'player-reconnected': () => void;
  'game-ended': (data: { winner: string; reason: 'victory' | 'timeout' | 'disconnect' }) => void;
  'error': (error: string) => void;
}

// API Types
export interface BackgroundGenerationRequest {
  gameId: string;
  style: 'popcap';
  theme: 'ocean-naval';
}

export interface BackgroundGenerationResponse {
  imageUrl: string;
  gameId: string;
}

// Utility Types
export type Direction = 'horizontal' | 'vertical';

export interface PlacementData {
  ship: Ship;
  startPosition: Position;
  direction: Direction;
}

export interface ShotData {
  position: Position;
  playerId: string;
  timestamp: number;
}

// Constants
export const SHIP_SIZES: Record<ShipType, number> = {
  carrier: 5,
  battleship: 4,
  cruiser: 3,
  submarine: 3,
  destroyer: 2,
};

export const BOARD_SIZE = 10;
export const TURN_TIMEOUT = 60000; // 60 seconds
export const DISCONNECT_TIMEOUT = 60000; // 60 seconds

// Validation Types
export interface ValidationResult {
  isValid: boolean;
  error?: string;
}

export interface GameValidation {
  canPlaceShip: (board: Board, ship: Ship, positions: Position[]) => ValidationResult;
  canFireShot: (game: Game, playerId: string, position: Position) => ValidationResult;
  isGameOver: (game: Game) => boolean;
}