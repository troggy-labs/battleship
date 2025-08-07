import { useState, useEffect, useCallback } from 'react';

interface UseGameTimerReturn {
  timeRemaining: number;
  isExpired: boolean;
  start: (duration: number, onExpire?: () => void) => void;
  stop: () => void;
  reset: () => void;
  formatTime: (time: number) => string;
}

export const useGameTimer = (): UseGameTimerReturn => {
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [isActive, setIsActive] = useState(false);
  const [onExpireCallback, setOnExpireCallback] = useState<(() => void) | null>(null);

  const isExpired = timeRemaining <= 0 && isActive;

  const start = useCallback((duration: number, onExpire?: () => void) => {
    setTimeRemaining(duration);
    setIsActive(true);
    if (onExpire) {
      setOnExpireCallback(() => onExpire);
    }
  }, []);

  const stop = useCallback(() => {
    setIsActive(false);
  }, []);

  const reset = useCallback(() => {
    setTimeRemaining(0);
    setIsActive(false);
    setOnExpireCallback(null);
  }, []);

  const formatTime = useCallback((time: number): string => {
    const totalSeconds = Math.ceil(time / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;

    if (minutes > 0) {
      return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    }
    
    return seconds.toString();
  }, []);

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;

    if (isActive && timeRemaining > 0) {
      interval = setInterval(() => {
        setTimeRemaining(prevTime => {
          const newTime = Math.max(0, prevTime - 1000);
          
          if (newTime === 0 && onExpireCallback) {
            onExpireCallback();
          }
          
          return newTime;
        });
      }, 1000);
    } else if (timeRemaining <= 0) {
      setIsActive(false);
    }

    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [isActive, timeRemaining, onExpireCallback]);

  return {
    timeRemaining,
    isExpired,
    start,
    stop,
    reset,
    formatTime
  };
};