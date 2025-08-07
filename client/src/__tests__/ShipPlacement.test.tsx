import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ShipPlacement } from '../components/ShipPlacement';
import { Ship, SHIP_SIZES } from '../../../shared/types';

// Mock framer-motion
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }: any) => children,
}));

describe('ShipPlacement', () => {
  const createDefaultShips = (): Ship[] => {
    return Object.entries(SHIP_SIZES).map(([type, size]) => ({
      id: `${type}-1`,
      type: type as keyof typeof SHIP_SIZES,
      size,
      positions: [],
      isPlaced: false,
      isSunk: false
    }));
  };

  it('should render all ship types', () => {
    const ships = createDefaultShips();
    const onShipPlace = vi.fn();
    const onRotate = vi.fn();
    const onReady = vi.fn();

    render(
      <ShipPlacement
        ships={ships}
        onShipPlace={onShipPlace}
        onRotate={onRotate}
        onReady={onReady}
        allShipsPlaced={false}
      />
    );

    // Should show all 5 ship types
    expect(screen.getByText(/Carrier/)).toBeInTheDocument();
    expect(screen.getByText(/Battleship/)).toBeInTheDocument();
    expect(screen.getByText(/Cruiser/)).toBeInTheDocument();
    expect(screen.getByText(/Submarine/)).toBeInTheDocument();
    expect(screen.getByText(/Destroyer/)).toBeInTheDocument();
  });

  it('should show ship sizes correctly', () => {
    const ships = createDefaultShips();
    const onShipPlace = vi.fn();
    const onRotate = vi.fn();
    const onReady = vi.fn();

    render(
      <ShipPlacement
        ships={ships}
        onShipPlace={onShipPlace}
        onRotate={onRotate}
        onReady={onReady}
        allShipsPlaced={false}
      />
    );

    // Carrier should show 5 squares
    const carrierShip = screen.getByTestId('ship-carrier-1');
    const carrierSquares = carrierShip.querySelectorAll('.ship-square');
    expect(carrierSquares).toHaveLength(5);

    // Destroyer should show 2 squares
    const destroyerShip = screen.getByTestId('ship-destroyer-1');
    const destroyerSquares = destroyerShip.querySelectorAll('.ship-square');
    expect(destroyerSquares).toHaveLength(2);
  });

  it('should handle ship drag start', () => {
    const ships = createDefaultShips();
    const onShipPlace = vi.fn();
    const onRotate = vi.fn();
    const onReady = vi.fn();

    render(
      <ShipPlacement
        ships={ships}
        onShipPlace={onShipPlace}
        onRotate={onRotate}
        onReady={onReady}
        allShipsPlaced={false}
      />
    );

    const carrierShip = screen.getByTestId('ship-carrier-1');
    
    fireEvent.dragStart(carrierShip, {
      dataTransfer: {
        setData: vi.fn()
      }
    });

    // Should add dragging class
    expect(carrierShip).toHaveClass('dragging');
  });

  it('should handle ship rotation', () => {
    const ships = createDefaultShips();
    const onShipPlace = vi.fn();
    const onRotate = vi.fn();
    const onReady = vi.fn();

    render(
      <ShipPlacement
        ships={ships}
        onShipPlace={onShipPlace}
        onRotate={onRotate}
        onReady={onReady}
        allShipsPlaced={false}
      />
    );

    const rotateButton = screen.getByTestId('rotate-carrier-1');
    fireEvent.click(rotateButton);

    expect(onRotate).toHaveBeenCalledWith('carrier-1');
  });

  it('should disable rotation for placed ships', () => {
    const ships = createDefaultShips();
    ships[0].isPlaced = true; // Place the carrier

    const onShipPlace = vi.fn();
    const onRotate = vi.fn();
    const onReady = vi.fn();

    render(
      <ShipPlacement
        ships={ships}
        onShipPlace={onShipPlace}
        onRotate={onRotate}
        onReady={onReady}
        allShipsPlaced={false}
      />
    );

    const rotateButton = screen.getByTestId('rotate-carrier-1');
    expect(rotateButton).toBeDisabled();
  });

  it('should show placed ships differently', () => {
    const ships = createDefaultShips();
    ships[0].isPlaced = true; // Place the carrier
    ships[0].positions = [
      { row: 0, col: 0 },
      { row: 0, col: 1 },
      { row: 0, col: 2 },
      { row: 0, col: 3 },
      { row: 0, col: 4 }
    ];

    const onShipPlace = vi.fn();
    const onRotate = vi.fn();
    const onReady = vi.fn();

    render(
      <ShipPlacement
        ships={ships}
        onShipPlace={onShipPlace}
        onRotate={onRotate}
        onReady={onReady}
        allShipsPlaced={false}
      />
    );

    const carrierShip = screen.getByTestId('ship-carrier-1');
    expect(carrierShip).toHaveClass('placed');
  });

  it('should enable ready button when all ships placed', () => {
    const ships = createDefaultShips();
    ships.forEach(ship => { ship.isPlaced = true; });

    const onShipPlace = vi.fn();
    const onRotate = vi.fn();
    const onReady = vi.fn();

    render(
      <ShipPlacement
        ships={ships}
        onShipPlace={onShipPlace}
        onRotate={onRotate}
        onReady={onReady}
        allShipsPlaced={true}
      />
    );

    const readyButton = screen.getByRole('button', { name: /ready/i });
    expect(readyButton).not.toBeDisabled();
  });

  it('should disable ready button when ships not all placed', () => {
    const ships = createDefaultShips();
    // Leave some ships unplaced

    const onShipPlace = vi.fn();
    const onRotate = vi.fn();
    const onReady = vi.fn();

    render(
      <ShipPlacement
        ships={ships}
        onShipPlace={onShipPlace}
        onRotate={onRotate}
        onReady={onReady}
        allShipsPlaced={false}
      />
    );

    const readyButton = screen.getByRole('button', { name: /ready/i });
    expect(readyButton).toBeDisabled();
  });

  it('should call onReady when ready button clicked', () => {
    const ships = createDefaultShips();
    ships.forEach(ship => { ship.isPlaced = true; });

    const onShipPlace = vi.fn();
    const onRotate = vi.fn();
    const onReady = vi.fn();

    render(
      <ShipPlacement
        ships={ships}
        onShipPlace={onShipPlace}
        onRotate={onRotate}
        onReady={onReady}
        allShipsPlaced={true}
      />
    );

    const readyButton = screen.getByRole('button', { name: /ready/i });
    fireEvent.click(readyButton);

    expect(onReady).toHaveBeenCalled();
  });

  it('should show placement progress', () => {
    const ships = createDefaultShips();
    ships[0].isPlaced = true;
    ships[1].isPlaced = true; // 2 out of 5 placed

    const onShipPlace = vi.fn();
    const onRotate = vi.fn();
    const onReady = vi.fn();

    render(
      <ShipPlacement
        ships={ships}
        onShipPlace={onShipPlace}
        onRotate={onRotate}
        onReady={onReady}
        allShipsPlaced={false}
      />
    );

    // Should show progress (2/5)
    expect(screen.getByText(/2.*5/)).toBeInTheDocument();
  });

  it('should handle ship removal from board', () => {
    const ships = createDefaultShips();
    ships[0].isPlaced = true;
    ships[0].positions = [
      { row: 0, col: 0 },
      { row: 0, col: 1 },
      { row: 0, col: 2 },
      { row: 0, col: 3 },
      { row: 0, col: 4 }
    ];

    const onShipPlace = vi.fn();
    const onRotate = vi.fn();
    const onReady = vi.fn();

    render(
      <ShipPlacement
        ships={ships}
        onShipPlace={onShipPlace}
        onRotate={onRotate}
        onReady={onReady}
        allShipsPlaced={false}
      />
    );

    // Double-click to remove ship from board
    const carrierShip = screen.getByTestId('ship-carrier-1');
    fireEvent.doubleClick(carrierShip);

    expect(onShipPlace).toHaveBeenCalledWith('carrier-1', []);
  });

  it('should show ship orientation correctly', () => {
    const ships = createDefaultShips();
    
    const onShipPlace = vi.fn();
    const onRotate = vi.fn();
    const onReady = vi.fn();

    render(
      <ShipPlacement
        ships={ships}
        onShipPlace={onShipPlace}
        onRotate={onRotate}
        onReady={onReady}
        allShipsPlaced={false}
        shipOrientations={{ 'carrier-1': 'vertical' }}
      />
    );

    const carrierShip = screen.getByTestId('ship-carrier-1');
    expect(carrierShip).toHaveClass('vertical');
  });
});