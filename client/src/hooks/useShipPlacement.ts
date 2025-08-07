import { useState, useCallback, useMemo } from 'react';
import { Ship, Position, Direction } from '../../../shared/types';
import { getShipPositions, canPlaceShipAtPositions } from '../../../shared/utils';

interface UseShipPlacementReturn {
  selectedShip: Ship | null;
  shipOrientations: Record<string, Direction>;
  hoveredPosition: Position | null;
  isValidPlacement: boolean;
  draggedShip: Ship | null;
  selectShip: (ship: Ship) => void;
  deselectShip: () => void;
  rotateShip: (shipId: string) => void;
  setHoveredPosition: (position: Position | null) => void;
  startDrag: (ship: Ship) => void;
  endDrag: () => void;
  getPlacementPositions: (ship: Ship, startPosition: Position, direction?: Direction) => Position[];
  canPlaceAt: (ship: Ship, startPosition: Position, direction?: Direction) => boolean;
  getShipOrientation: (shipId: string) => Direction;
}

export const useShipPlacement = (
  ships: Ship[],
  boardGrid: any[][] // Board grid for validation
): UseShipPlacementReturn => {
  const [selectedShip, setSelectedShip] = useState<Ship | null>(null);
  const [shipOrientations, setShipOrientations] = useState<Record<string, Direction>>(() => {
    // Initialize all ships as horizontal
    const initialOrientations: Record<string, Direction> = {};
    ships.forEach(ship => {
      initialOrientations[ship.id] = 'horizontal';
    });
    return initialOrientations;
  });
  const [hoveredPosition, setHoveredPosition] = useState<Position | null>(null);
  const [draggedShip, setDraggedShip] = useState<Ship | null>(null);

  const selectShip = useCallback((ship: Ship) => {
    if (!ship.isPlaced) {
      setSelectedShip(ship);
    }
  }, []);

  const deselectShip = useCallback(() => {
    setSelectedShip(null);
    setHoveredPosition(null);
  }, []);

  const rotateShip = useCallback((shipId: string) => {
    setShipOrientations(prev => ({
      ...prev,
      [shipId]: prev[shipId] === 'horizontal' ? 'vertical' : 'horizontal'
    }));
  }, []);

  const startDrag = useCallback((ship: Ship) => {
    setDraggedShip(ship);
    setSelectedShip(ship);
  }, []);

  const endDrag = useCallback(() => {
    setDraggedShip(null);
  }, []);

  const getPlacementPositions = useCallback((
    ship: Ship, 
    startPosition: Position, 
    direction?: Direction
  ): Position[] => {
    const orientation = direction || shipOrientations[ship.id] || 'horizontal';
    return getShipPositions(startPosition, ship.size, orientation);
  }, [shipOrientations]);

  const canPlaceAt = useCallback((
    ship: Ship, 
    startPosition: Position, 
    direction?: Direction
  ): boolean => {
    const positions = getPlacementPositions(ship, startPosition, direction);
    return canPlaceShipAtPositions(boardGrid, positions);
  }, [boardGrid, getPlacementPositions]);

  const getShipOrientation = useCallback((shipId: string): Direction => {
    return shipOrientations[shipId] || 'horizontal';
  }, [shipOrientations]);

  const isValidPlacement = useMemo(() => {
    if (!selectedShip || !hoveredPosition) return false;
    return canPlaceAt(selectedShip, hoveredPosition);
  }, [selectedShip, hoveredPosition, canPlaceAt]);

  return {
    selectedShip,
    shipOrientations,
    hoveredPosition,
    isValidPlacement,
    draggedShip,
    selectShip,
    deselectShip,
    rotateShip,
    setHoveredPosition,
    startDrag,
    endDrag,
    getPlacementPositions,
    canPlaceAt,
    getShipOrientation
  };
};