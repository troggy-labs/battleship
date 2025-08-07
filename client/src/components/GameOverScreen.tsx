import { motion } from 'framer-motion';
import { Game, Player } from '../../../shared/types';
import { GameBoard } from './GameBoard';
import { getShipName } from '../../../shared/utils';
import styles from '../styles/GameOverScreen.module.css';

interface GameOverScreenProps {
  game: Game;
  playerId: string;
  onNewGame: () => void;
  className?: string;
}

export const GameOverScreen: React.FC<GameOverScreenProps> = ({
  game,
  playerId,
  onNewGame,
  className
}) => {
  const isWinner = game.winner === playerId;
  const player = game.players.find(p => p.id === playerId);
  const opponent = game.players.find(p => p.id !== playerId);

  if (!player || !opponent) {
    return null;
  }

  const getResultMessage = () => {
    if (isWinner) {
      return {
        title: '🎉 Victory! 🎉',
        subtitle: 'You sank all enemy ships!',
        className: styles.victory
      };
    } else {
      return {
        title: '💔 Defeat 💔',
        subtitle: 'All your ships were sunk.',
        className: styles.defeat
      };
    }
  };

  const result = getResultMessage();

  const getShipStatusList = (ships: any[]) => {
    return ships.map(ship => ({
      ...ship,
      name: getShipName(ship),
      status: ship.isSunk ? 'Sunk' : 'Survived'
    }));
  };

  return (
    <motion.div
      className={`${styles.gameOverScreen} ${className || ''}`}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      <div className={styles.overlay}>
        <motion.div
          className={styles.content}
          initial={{ scale: 0.8, y: 50 }}
          animate={{ scale: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.4 }}
        >
          <div className={`${styles.header} ${result.className}`}>
            <motion.h1
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.3, duration: 0.5, type: "spring" }}
            >
              {result.title}
            </motion.h1>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5, duration: 0.3 }}
            >
              {result.subtitle}
            </motion.p>
          </div>

          <div className={styles.gameResults}>
            <div className={styles.boardsContainer}>
              <div className={styles.boardSection}>
                <h3>Your Fleet</h3>
                <div className={styles.boardWrapper}>
                  <GameBoard
                    board={player.board.grid}
                    ships={player.board.ships}
                    isOwner={true}
                    interactive={false}
                    showCoordinates={false}
                    className={styles.resultBoard}
                  />
                </div>
                <div className={styles.shipsList}>
                  {getShipStatusList(player.board.ships).map(ship => (
                    <div 
                      key={ship.id} 
                      className={`${styles.shipItem} ${ship.isSunk ? styles.sunk : styles.survived}`}
                    >
                      <span className={styles.shipName}>{ship.name}</span>
                      <span className={styles.shipStatus}>{ship.status}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className={styles.boardSection}>
                <h3>Enemy Fleet</h3>
                <div className={styles.boardWrapper}>
                  <GameBoard
                    board={opponent.board.grid}
                    ships={opponent.board.ships}
                    isOwner={true} // Show all ships in game over screen
                    interactive={false}
                    showCoordinates={false}
                    className={styles.resultBoard}
                  />
                </div>
                <div className={styles.shipsList}>
                  {getShipStatusList(opponent.board.ships).map(ship => (
                    <div 
                      key={ship.id} 
                      className={`${styles.shipItem} ${ship.isSunk ? styles.sunk : styles.survived}`}
                    >
                      <span className={styles.shipName}>{ship.name}</span>
                      <span className={styles.shipStatus}>{ship.status}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className={styles.gameStats}>
              <h3>Battle Statistics</h3>
              <div className={styles.statsGrid}>
                <div className={styles.statItem}>
                  <span className={styles.statLabel}>Your Ships Remaining</span>
                  <span className={styles.statValue}>{player.board.shipsRemaining}</span>
                </div>
                <div className={styles.statItem}>
                  <span className={styles.statLabel}>Enemy Ships Remaining</span>
                  <span className={styles.statValue}>{opponent.board.shipsRemaining}</span>
                </div>
                <div className={styles.statItem}>
                  <span className={styles.statLabel}>Game Duration</span>
                  <span className={styles.statValue}>
                    {Math.round((Date.now() - game.createdAt) / 60000)} minutes
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className={styles.actions}>
            <motion.button
              className={styles.newGameButton}
              onClick={onNewGame}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8, duration: 0.3 }}
            >
              🚢 Play Again
            </motion.button>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
};