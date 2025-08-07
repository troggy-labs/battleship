import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { GameBoard } from '../components/GameBoard';
import { Board, Ship } from '../../../shared/types';

// Mock framer-motion
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }: any) => children,
}));

describe('GameBoard', () => {
  const createEmptyBoard = (): Board => {
    return Array(10).fill(null).map((_, row) =>
      Array(10).fill(null).map((_, col) => ({
        position: { row, col },
        state: 'empty' as const
      }))
    );
  };

  const mockShips: Ship[] = [
    {
      id: 'destroyer1',
      type: 'destroyer',
      size: 2,
      positions: [{ row: 0, col: 0 }, { row: 0, col: 1 }],
      isPlaced: true,
      isSunk: false
    }
  ];

  it('should render 10x10 grid', () => {
    const board = createEmptyBoard();
    const onCellClick = vi.fn();

    render(
      <GameBoard
        board={board}
        ships={[]}
        isOwner={true}
        onCellClick={onCellClick}
      />
    );

    // Should have 100 cells (10x10)
    const cells = screen.getAllByTestId(/cell-/);
    expect(cells).toHaveLength(100);
  });

  it('should display ships for owner board', () => {
    const board = createEmptyBoard();
    board[0][0].state = 'ship';
    board[0][0].shipId = 'destroyer1';
    board[0][1].state = 'ship';
    board[0][1].shipId = 'destroyer1';

    render(
      <GameBoard
        board={board}
        ships={mockShips}
        isOwner={true}
        onCellClick={vi.fn()}
      />
    );

    const shipCells = screen.getAllByTestId(/cell-.*/).filter(cell =>
      cell.classList.contains('ship')
    );
    expect(shipCells).toHaveLength(2);
  });

  it('should hide ships for opponent board', () => {
    const board = createEmptyBoard();
    board[0][0].state = 'ship';
    board[0][0].shipId = 'destroyer1';
    board[0][1].state = 'ship';
    board[0][1].shipId = 'destroyer1';

    render(
      <GameBoard
        board={board}
        ships={mockShips}
        isOwner={false}
        onCellClick={vi.fn()}
      />
    );

    // Ships should not be visible on opponent board
    const shipCells = screen.getAllByTestId(/cell-.*/).filter(cell =>
      cell.classList.contains('ship')
    );
    expect(shipCells).toHaveLength(0);
  });

  it('should display hit markers', () => {
    const board = createEmptyBoard();
    board[5][5].state = 'hit';

    render(
      <GameBoard
        board={board}
        ships={[]}
        isOwner={false}
        onCellClick={vi.fn()}
      />
    );

    const hitCell = screen.getByTestId('cell-5-5');
    expect(hitCell).toHaveClass('hit');
  });

  it('should display miss markers', () => {
    const board = createEmptyBoard();
    board[3][7].state = 'miss';

    render(
      <GameBoard
        board={board}
        ships={[]}
        isOwner={false}
        onCellClick={vi.fn()}
      />
    );

    const missCell = screen.getByTestId('cell-3-7');
    expect(missCell).toHaveClass('miss');
  });

  it('should handle cell clicks', () => {
    const board = createEmptyBoard();
    const onCellClick = vi.fn();

    render(
      <GameBoard
        board={board}
        ships={[]}
        isOwner={false}
        onCellClick={onCellClick}
      />
    );

    const cell = screen.getByTestId('cell-5-5');
    fireEvent.click(cell);

    expect(onCellClick).toHaveBeenCalledWith({ row: 5, col: 5 });
  });

  it('should not allow clicks on owner board during game', () => {
    const board = createEmptyBoard();
    const onCellClick = vi.fn();

    render(
      <GameBoard
        board={board}
        ships={[]}
        isOwner={true}
        onCellClick={onCellClick}
        interactive={false}
      />
    );

    const cell = screen.getByTestId('cell-5-5');
    fireEvent.click(cell);

    expect(onCellClick).not.toHaveBeenCalled();
  });

  it('should show sunk ships differently', () => {
    const board = createEmptyBoard();
    board[0][0].state = 'sunk';
    board[0][0].shipId = 'destroyer1';
    board[0][1].state = 'sunk';
    board[0][1].shipId = 'destroyer1';

    const sunkShip: Ship = {
      ...mockShips[0],
      isSunk: true
    };

    render(
      <GameBoard
        board={board}
        ships={[sunkShip]}
        isOwner={true}
        onCellClick={vi.fn()}
      />
    );

    const sunkCells = screen.getAllByTestId(/cell-.*/).filter(cell =>
      cell.classList.contains('sunk')
    );
    expect(sunkCells).toHaveLength(2);
  });

  it('should display coordinates', () => {
    const board = createEmptyBoard();

    render(
      <GameBoard
        board={board}
        ships={[]}
        isOwner={true}
        onCellClick={vi.fn()}
        showCoordinates={true}
      />
    );

    // Check for row labels
    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByText('10')).toBeInTheDocument();

    // Check for column labels  
    expect(screen.getByText('A')).toBeInTheDocument();
    expect(screen.getByText('J')).toBeInTheDocument();
  });

  it('should highlight valid drop zones during ship placement', () => {
    const board = createEmptyBoard();

    render(
      <GameBoard
        board={board}
        ships={[]}
        isOwner={true}
        onCellClick={vi.fn()}
        placementMode={true}
        hoveredShip={{ type: 'destroyer', size: 2 }}
        hoverPosition={{ row: 2, col: 3 }}
        hoverDirection="horizontal"
      />
    );

    const dropZone1 = screen.getByTestId('cell-2-3');
    const dropZone2 = screen.getByTestId('cell-2-4');
    
    expect(dropZone1).toHaveClass('valid-placement');
    expect(dropZone2).toHaveClass('valid-placement');
  });

  it('should highlight invalid drop zones', () => {
    const board = createEmptyBoard();
    // Mark some cells as occupied
    board[2][4].state = 'ship';

    render(
      <GameBoard
        board={board}
        ships={[]}
        isOwner={true}
        onCellClick={vi.fn()}
        placementMode={true}
        hoveredShip={{ type: 'destroyer', size: 2 }}
        hoverPosition={{ row: 2, col: 3 }}
        hoverDirection="horizontal"
      />
    );

    const invalidDropZone = screen.getByTestId('cell-2-4');
    expect(invalidDropZone).toHaveClass('invalid-placement');
  });
});