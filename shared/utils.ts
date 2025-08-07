import { Position, Board, Ship, Direction, SHIP_SIZES, BOARD_SIZE } from './types';

export const createEmptyBoard = (): Board => {
  const board: Board = [];
  for (let row = 0; row < BOARD_SIZE; row++) {
    board[row] = [];
    for (let col = 0; col < BOARD_SIZE; col++) {
      board[row][col] = {
        position: { row, col },
        state: 'empty' as const
      };
    }
  }
  return board;
};

export const createDefaultShips = (): Ship[] => {
  return Object.entries(SHIP_SIZES).map(([type, size]) => ({
    id: `${type}-1`,
    type: type as keyof typeof SHIP_SIZES,
    size,
    positions: [],
    isPlaced: false,
    isSunk: false
  }));
};

export const isValidPosition = (position: Position): boolean => {
  return position.row >= 0 && 
         position.row < BOARD_SIZE && 
         position.col >= 0 && 
         position.col < BOARD_SIZE;
};

export const getShipPositions = (
  startPosition: Position,
  size: number,
  direction: Direction
): Position[] => {
  const positions: Position[] = [];
  
  for (let i = 0; i < size; i++) {
    if (direction === 'horizontal') {
      positions.push({
        row: startPosition.row,
        col: startPosition.col + i
      });
    } else {
      positions.push({
        row: startPosition.row + i,
        col: startPosition.col
      });
    }
  }
  
  return positions;
};

export const canPlaceShipAtPositions = (
  board: Board,
  positions: Position[]
): boolean => {
  return positions.every(pos => {
    if (!isValidPosition(pos)) return false;
    
    const cell = board[pos.row][pos.col];
    return cell.state === 'empty';
  });
};

export const getAdjacentPositions = (position: Position): Position[] => {
  const adjacent: Position[] = [];
  
  for (let rowOffset = -1; rowOffset <= 1; rowOffset++) {
    for (let colOffset = -1; colOffset <= 1; colOffset++) {
      if (rowOffset === 0 && colOffset === 0) continue;
      
      const newPos = {
        row: position.row + rowOffset,
        col: position.col + colOffset
      };
      
      if (isValidPosition(newPos)) {
        adjacent.push(newPos);
      }
    }
  }
  
  return adjacent;
};

export const positionsEqual = (pos1: Position, pos2: Position): boolean => {
  return pos1.row === pos2.row && pos1.col === pos2.col;
};

export const shipContainsPosition = (ship: Ship, position: Position): boolean => {
  return ship.positions.some(pos => positionsEqual(pos, position));
};

export const generateGameId = (): string => {
  return Math.random().toString(36).substring(2, 15) + 
         Math.random().toString(36).substring(2, 15);
};

export const generatePlayerId = (): string => {
  return 'player_' + Math.random().toString(36).substring(2, 15);
};

export const formatTime = (milliseconds: number): string => {
  const seconds = Math.ceil(milliseconds / 1000);
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  
  if (mins > 0) {
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }
  
  return secs.toString();
};

export const getColumnLabel = (col: number): string => {
  return String.fromCharCode(65 + col); // A, B, C, etc.
};

export const getRowLabel = (row: number): string => {
  return (row + 1).toString(); // 1, 2, 3, etc.
};

export const parseCoordinate = (coordinate: string): Position | null => {
  if (coordinate.length < 2) return null;
  
  const col = coordinate.charCodeAt(0) - 65; // A=0, B=1, etc.
  const row = parseInt(coordinate.slice(1)) - 1; // 1=0, 2=1, etc.
  
  if (isValidPosition({ row, col })) {
    return { row, col };
  }
  
  return null;
};

export const formatCoordinate = (position: Position): string => {
  return getColumnLabel(position.col) + getRowLabel(position.row);
};

export const getShipName = (ship: Ship): string => {
  const names = {
    carrier: 'Carrier',
    battleship: 'Battleship', 
    cruiser: 'Cruiser',
    submarine: 'Submarine',
    destroyer: 'Destroyer'
  };
  
  return names[ship.type];
};

export const isShipFullyHit = (ship: Ship, board: Board): boolean => {
  return ship.positions.every(pos => {
    if (!board[pos.row] || !board[pos.row][pos.col]) {
      console.error('Invalid board position in isShipFullyHit:', pos, 'Board length:', board?.length);
      return false;
    }
    const cell = board[pos.row][pos.col];
    return cell.state === 'hit' || cell.state === 'sunk';
  });
};

export const markShipAsSunk = (ship: Ship, board: Board): void => {
  ship.positions.forEach(pos => {
    if (board[pos.row] && board[pos.row][pos.col]) {
      board[pos.row][pos.col].state = 'sunk';
    }
  });
  ship.isSunk = true;
};

export const countRemainingShips = (ships: Ship[]): number => {
  return ships.filter(ship => ship.isPlaced && !ship.isSunk).length;
};

export const areAllShipsPlaced = (ships: Ship[]): boolean => {
  return ships.every(ship => ship.isPlaced);
};

export const getRandomInt = (min: number, max: number): number => {
  return Math.floor(Math.random() * (max - min + 1)) + min;
};

export const shuffleArray = <T>(array: T[]): T[] => {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void => {
  let timeout: NodeJS.Timeout;
  
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
};

export const throttle = <T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void => {
  let inThrottle: boolean;
  
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
};

export const generateRandomShipPlacements = (ships: Ship[]): Ship[] => {
  const board: boolean[][] = Array(BOARD_SIZE).fill(null).map(() => 
    Array(BOARD_SIZE).fill(false)
  );
  
  const placedShips: Ship[] = [];
  
  // Sort ships by size (largest first) for better placement
  const sortedShips = [...ships].sort((a, b) => b.size - a.size);
  
  for (const ship of sortedShips) {
    let placed = false;
    let attempts = 0;
    const maxAttempts = 100;
    
    while (!placed && attempts < maxAttempts) {
      const direction: Direction = Math.random() < 0.5 ? 'horizontal' : 'vertical';
      const maxRow = direction === 'vertical' ? BOARD_SIZE - ship.size : BOARD_SIZE - 1;
      const maxCol = direction === 'horizontal' ? BOARD_SIZE - ship.size : BOARD_SIZE - 1;
      
      const startRow = getRandomInt(0, maxRow);
      const startCol = getRandomInt(0, maxCol);
      const startPosition: Position = { row: startRow, col: startCol };
      
      const positions = getShipPositions(startPosition, ship.size, direction);
      
      // Check if all positions are valid and empty
      const canPlace = positions.every(pos => 
        isValidPosition(pos) && !board[pos.row][pos.col]
      );
      
      if (canPlace) {
        // Mark positions as occupied
        positions.forEach(pos => {
          board[pos.row][pos.col] = true;
        });
        
        // Create placed ship
        const placedShip: Ship = {
          ...ship,
          positions,
          isPlaced: true,
          isSunk: false
        };
        
        placedShips.push(placedShip);
        placed = true;
      }
      
      attempts++;
    }
    
    if (!placed) {
      console.warn(`Could not place ship ${ship.type} after ${maxAttempts} attempts`);
      // Add unplaced ship as-is
      placedShips.push({ ...ship });
    }
  }
  
  return placedShips;
};