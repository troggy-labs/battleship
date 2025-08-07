import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import styles from '../styles/ConnectionStatus.module.css';

interface ConnectionStatusProps {
  isConnected: boolean;
  error: string | null;
  isReconnecting?: boolean;
  className?: string;
}

export const ConnectionStatus: React.FC<ConnectionStatusProps> = ({
  isConnected,
  error,
  isReconnecting = false,
  className
}) => {
  const getStatusConfig = () => {
    if (error) {
      return {
        icon: '❌',
        text: 'Connection Error',
        subtext: error,
        className: styles.error
      };
    }
    
    if (isReconnecting) {
      return {
        icon: '🔄',
        text: 'Reconnecting...',
        subtext: 'Trying to restore connection',
        className: styles.reconnecting
      };
    }
    
    if (!isConnected) {
      return {
        icon: '⚠️',
        text: 'Disconnected',
        subtext: 'No connection to server',
        className: styles.disconnected
      };
    }
    
    return {
      icon: '🟢',
      text: 'Connected',
      subtext: 'Real-time connection active',
      className: styles.connected
    };
  };

  const status = getStatusConfig();
  
  // Only show status when there are issues or briefly when connecting
  const shouldShow = !isConnected || error || isReconnecting;

  return (
    <AnimatePresence>
      {shouldShow && (
        <motion.div
          className={`${styles.connectionStatus} ${status.className} ${className || ''}`}
          initial={{ opacity: 0, y: -50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -50 }}
          transition={{ duration: 0.3 }}
        >
          <motion.div
            className={styles.statusIcon}
            animate={isReconnecting ? { rotate: 360 } : {}}
            transition={isReconnecting ? { 
              repeat: Infinity, 
              duration: 1,
              ease: "linear" 
            } : {}}
          >
            {status.icon}
          </motion.div>
          
          <div className={styles.statusContent}>
            <div className={styles.statusText}>
              {status.text}
            </div>
            <div className={styles.statusSubtext}>
              {status.subtext}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};