import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Ship, Direction } from '../../../shared/types';
import { getShipName } from '../../../shared/utils';
import styles from '../styles/ShipPlacement.module.css';

interface ShipPlacementProps {
  ships: Ship[];
  onShipPlace: (shipId: string, positions: any[]) => void;
  onRotate: (shipId: string) => void;
  onReady: () => void;
  onAutoPlace?: () => void;
  allShipsPlaced: boolean;
  shipOrientations?: Record<string, Direction>;
  onShipSelect?: (ship: Ship) => void;
  selectedShip?: Ship | null;
}

export const ShipPlacement: React.FC<ShipPlacementProps> = ({
  ships,
  onShipPlace,
  onRotate,
  onReady,
  onAutoPlace,
  allShipsPlaced,
  shipOrientations = {},
  onShipSelect,
  selectedShip
}) => {
  const placedShipsCount = ships.filter(ship => ship.isPlaced).length;
  const totalShipsCount = ships.length;

  const handleShipClick = (ship: Ship) => {
    if (ship.isPlaced) {
      // Double-click to remove from board
      return;
    }
    
    if (onShipSelect) {
      onShipSelect(ship);
    }
  };

  const handleShipDoubleClick = (ship: Ship) => {
    if (ship.isPlaced) {
      // Remove ship from board
      onShipPlace(ship.id, []);
    }
  };

  const handleDragStart = (e: React.DragEvent, ship: Ship) => {
    if (ship.isPlaced) return;
    
    e.dataTransfer.setData('text/plain', ship.id);
    e.currentTarget.classList.add(styles.dragging);
    
    if (onShipSelect) {
      onShipSelect(ship);
    }
  };

  const handleDragEnd = (e: React.DragEvent) => {
    e.currentTarget.classList.remove(styles.dragging);
  };

  const getShipClassName = (ship: Ship): string => {
    const classes = [styles.ship];
    
    if (ship.isPlaced) {
      classes.push(styles.placed);
    }
    
    if (selectedShip?.id === ship.id) {
      classes.push(styles.selected);
    }
    
    const orientation = shipOrientations[ship.id] || 'horizontal';
    classes.push(orientation === 'vertical' ? styles.vertical : styles.horizontal);
    
    return classes.join(' ');
  };

  return (
    <div className={styles.shipPlacement}>
      <div className={styles.header}>
        <h2>Place Your Ships</h2>
        <div className={styles.progress}>
          <span>{placedShipsCount}/{totalShipsCount} ships placed</span>
          <div className={styles.progressBar}>
            <div 
              className={styles.progressFill}
              style={{ width: `${(placedShipsCount / totalShipsCount) * 100}%` }}
            />
          </div>
        </div>
      </div>

      <div className={styles.instructions}>
        <p>Drag ships to the board or click to select and place. Use rotation buttons to change orientation.</p>
      </div>

      <div className={styles.shipsContainer}>
        <AnimatePresence>
          {ships.map(ship => (
            <motion.div
              key={ship.id}
              className={styles.shipContainer}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              <div className={styles.shipInfo}>
                <span className={styles.shipName}>{getShipName(ship)}</span>
                <span className={styles.shipSize}>({ship.size} squares)</span>
              </div>
              
              <div className={styles.shipControls}>
                <motion.div
                  className={getShipClassName(ship)}
                  data-testid={`ship-${ship.id}`}
                  draggable={!ship.isPlaced}
                  onClick={() => handleShipClick(ship)}
                  onDoubleClick={() => handleShipDoubleClick(ship)}
                  onDragStart={(e) => handleDragStart(e, ship)}
                  onDragEnd={handleDragEnd}
                  whileHover={{ scale: ship.isPlaced ? 1 : 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  {Array.from({ length: ship.size }, (_, index) => (
                    <div key={index} className={styles.shipSquare} />
                  ))}
                </motion.div>

                <button
                  className={styles.rotateButton}
                  data-testid={`rotate-${ship.id}`}
                  onClick={() => onRotate(ship.id)}
                  disabled={ship.isPlaced}
                  title="Rotate ship"
                >
                  🔄
                </button>
              </div>

              {ship.isPlaced && (
                <motion.div
                  className={styles.placedIndicator}
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.1 }}
                >
                  ✅ Placed
                </motion.div>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      <div className={styles.actions}>
        {onAutoPlace && placedShipsCount < totalShipsCount && (
          <motion.button
            className={styles.autoPlaceButton}
            onClick={onAutoPlace}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            🎲 Auto Place Ships
          </motion.button>
        )}
        
        <motion.button
          className={styles.readyButton}
          onClick={onReady}
          disabled={!allShipsPlaced}
          whileHover={allShipsPlaced ? { scale: 1.05 } : {}}
          whileTap={allShipsPlaced ? { scale: 0.95 } : {}}
        >
          {allShipsPlaced ? 'Ready to Play!' : `Place ${totalShipsCount - placedShipsCount} more ships`}
        </motion.button>
      </div>
    </div>
  );
};