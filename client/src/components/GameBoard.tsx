import { motion } from 'framer-motion';
import { Board, Ship, Position, Direction } from '../../../shared/types';
import { getColumnLabel, getRowLabel, positionsEqual } from '../../../shared/utils';
import styles from '../styles/GameBoard.module.css';

interface GameBoardProps {
  board: Board;
  ships: Ship[];
  isOwner: boolean;
  onCellClick?: (position: Position) => void;
  onCellDrop?: (position: Position, shipId: string) => void;
  onCellDragOver?: (position: Position) => void;
  interactive?: boolean;
  showCoordinates?: boolean;
  placementMode?: boolean;
  hoveredShip?: { type: string; size: number };
  hoverPosition?: Position | null;
  hoverDirection?: Direction;
  className?: string;
}

export const GameBoard: React.FC<GameBoardProps> = ({
  board,
  ships,
  isOwner,
  onCellClick,
  onCellDrop,
  onCellDragOver,
  interactive = true,
  showCoordinates = true,
  placementMode = false,
  hoveredShip,
  hoverPosition,
  hoverDirection = 'horizontal',
  className
}) => {
  const getPreviewPositions = (): Position[] => {
    if (!hoveredShip || !hoverPosition) return [];

    const positions: Position[] = [];
    for (let i = 0; i < hoveredShip.size; i++) {
      if (hoverDirection === 'horizontal') {
        positions.push({
          row: hoverPosition.row,
          col: hoverPosition.col + i
        });
      } else {
        positions.push({
          row: hoverPosition.row + i,
          col: hoverPosition.col
        });
      }
    }
    return positions.filter(pos => 
      pos.row >= 0 && pos.row < 10 && pos.col >= 0 && pos.col < 10
    );
  };

  const isPreviewPosition = (position: Position): boolean => {
    if (!placementMode) return false;
    const previewPositions = getPreviewPositions();
    return previewPositions.some(pos => positionsEqual(pos, position));
  };

  const isValidPreviewPosition = (position: Position): boolean => {
    if (!isPreviewPosition(position)) return false;
    const cell = board[position.row][position.col];
    return cell.state === 'empty';
  };

  const getCellClassName = (position: Position): string => {
    const cell = board[position.row][position.col];
    const classes = [styles.cell];

    // Basic cell states
    if (cell.state === 'ship' && isOwner) {
      classes.push(styles.ship);
    } else if (cell.state === 'hit') {
      classes.push(styles.hit);
    } else if (cell.state === 'miss') {
      classes.push(styles.miss);
    } else if (cell.state === 'sunk') {
      classes.push(styles.sunk);
    }

    // Interactive states
    if (interactive && onCellClick) {
      classes.push(styles.interactive);
    }

    // Placement mode preview
    if (placementMode) {
      if (isValidPreviewPosition(position)) {
        classes.push(styles.validPlacement);
      } else if (isPreviewPosition(position)) {
        classes.push(styles.invalidPlacement);
      }
    }

    return classes.join(' ');
  };

  const handleCellClick = (position: Position) => {
    if (interactive && onCellClick) {
      onCellClick(position);
    }
  };

  const handleCellDragOver = (e: React.DragEvent, position: Position) => {
    if (placementMode) {
      e.preventDefault();
      if (onCellDragOver) {
        onCellDragOver(position);
      }
    }
  };

  const handleCellDrop = (e: React.DragEvent, position: Position) => {
    if (placementMode) {
      e.preventDefault();
      const shipId = e.dataTransfer.getData('text/plain');
      if (shipId && onCellDrop) {
        onCellDrop(position, shipId);
      }
    }
  };

  return (
    <div className={`${styles.gameBoard} ${className || ''}`}>
      {showCoordinates && (
        <>
          <div className={styles.columnLabels}>
            <div className={styles.cornerCell}></div>
            {Array.from({ length: 10 }, (_, i) => (
              <div key={i} className={styles.columnLabel}>
                {getColumnLabel(i)}
              </div>
            ))}
          </div>
          <div className={styles.boardWithRowLabels}>
            <div className={styles.rowLabels}>
              {Array.from({ length: 10 }, (_, i) => (
                <div key={i} className={styles.rowLabel}>
                  {getRowLabel(i)}
                </div>
              ))}
            </div>
            <div className={styles.grid}>
              {board.map((row, rowIndex) =>
                row.map((cell, colIndex) => {
                  const position = { row: rowIndex, col: colIndex };
                  return (
                    <motion.div
                      key={`${rowIndex}-${colIndex}`}
                      className={getCellClassName(position)}
                      data-testid={`cell-${rowIndex}-${colIndex}`}
                      onClick={() => handleCellClick(position)}
                      onDragOver={(e) => handleCellDragOver(e, position)}
                      onDrop={(e) => handleCellDrop(e, position)}
                      whileHover={interactive ? { scale: 1.05 } : {}}
                      whileTap={interactive ? { scale: 0.95 } : {}}
                    >
                      {cell.state === 'hit' && (
                        <motion.div
                          className={styles.explosion}
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ duration: 0.3 }}
                        >
                          💥
                        </motion.div>
                      )}
                      {cell.state === 'miss' && (
                        <motion.div
                          className={styles.splash}
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ duration: 0.2 }}
                        >
                          💧
                        </motion.div>
                      )}
                      {cell.state === 'sunk' && (
                        <motion.div
                          className={styles.sunkShip}
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ duration: 0.4 }}
                        >
                          🔥
                        </motion.div>
                      )}
                    </motion.div>
                  );
                })
              )}
            </div>
          </div>
        </>
      )}
      
      {!showCoordinates && (
        <div className={styles.grid}>
          {board.map((row, rowIndex) =>
            row.map((cell, colIndex) => {
              const position = { row: rowIndex, col: colIndex };
              return (
                <motion.div
                  key={`${rowIndex}-${colIndex}`}
                  className={getCellClassName(position)}
                  data-testid={`cell-${rowIndex}-${colIndex}`}
                  onClick={() => handleCellClick(position)}
                  onDragOver={(e) => handleCellDragOver(e, position)}
                  onDrop={(e) => handleCellDrop(e, position)}
                  whileHover={interactive ? { scale: 1.05 } : {}}
                  whileTap={interactive ? { scale: 0.95 } : {}}
                >
                  {cell.state === 'hit' && (
                    <motion.div
                      className={styles.explosion}
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ duration: 0.3 }}
                    >
                      💥
                    </motion.div>
                  )}
                  {cell.state === 'miss' && (
                    <motion.div
                      className={styles.splash}
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ duration: 0.2 }}
                    >
                      💧
                    </motion.div>
                  )}
                  {cell.state === 'sunk' && (
                    <motion.div
                      className={styles.sunkShip}
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ duration: 0.4 }}
                    >
                      🔥
                    </motion.div>
                  )}
                </motion.div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
};