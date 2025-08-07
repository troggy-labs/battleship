import { motion } from 'framer-motion';
import { formatTime } from '../../../shared/utils';
import styles from '../styles/GameTimer.module.css';

interface GameTimerProps {
  timeRemaining: number;
  isActive: boolean;
  isMyTurn: boolean;
  className?: string;
}

export const GameTimer: React.FC<GameTimerProps> = ({
  timeRemaining,
  isActive,
  isMyTurn,
  className
}) => {
  const formattedTime = formatTime(timeRemaining);
  const isLowTime = timeRemaining <= 10000 && isActive; // Last 10 seconds
  const isCriticalTime = timeRemaining <= 5000 && isActive; // Last 5 seconds

  const getTimerClassName = (): string => {
    const classes = [styles.timer];
    
    if (isActive && isMyTurn) {
      classes.push(styles.active);
    }
    
    if (isLowTime) {
      classes.push(styles.lowTime);
    }
    
    if (isCriticalTime) {
      classes.push(styles.criticalTime);
    }
    
    if (className) {
      classes.push(className);
    }
    
    return classes.join(' ');
  };

  if (!isActive) {
    return null;
  }

  return (
    <motion.div
      className={getTimerClassName()}
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ 
        scale: isCriticalTime ? [1, 1.1, 1] : 1, 
        opacity: 1 
      }}
      transition={{ 
        scale: { repeat: isCriticalTime ? Infinity : 0, duration: 0.5 },
        opacity: { duration: 0.3 }
      }}
    >
      <div className={styles.timerIcon}>
        {isMyTurn ? '⏰' : '⏳'}
      </div>
      
      <div className={styles.timeDisplay}>
        <motion.span
          className={styles.timeText}
          animate={isCriticalTime ? { 
            color: ['#f44336', '#ff9800', '#f44336'] 
          } : {}}
          transition={{ 
            repeat: isCriticalTime ? Infinity : 0, 
            duration: 0.5 
          }}
        >
          {formattedTime}
        </motion.span>
      </div>
      
      <div className={styles.turnIndicator}>
        {isMyTurn ? 'Your Turn' : 'Opponent\'s Turn'}
      </div>
      
      {isLowTime && (
        <motion.div
          className={styles.urgentPulse}
          animate={{ 
            scale: [1, 1.2, 1],
            opacity: [0.3, 0.7, 0.3]
          }}
          transition={{ 
            repeat: Infinity, 
            duration: 0.8 
          }}
        />
      )}
    </motion.div>
  );
};