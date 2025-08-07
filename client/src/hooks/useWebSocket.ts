import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { ClientEvents, ServerEvents } from '../../../shared/types';

interface UseWebSocketReturn {
  socket: Socket<ServerEvents, ClientEvents> | null;
  isConnected: boolean;
  error: string | null;
  emit: <K extends keyof ClientEvents>(event: K, ...args: Parameters<ClientEvents[K]>) => void;
  on: <K extends keyof ServerEvents>(event: K, handler: ServerEvents[K]) => void;
  off: <K extends keyof ServerEvents>(event: K, handler: ServerEvents[K]) => void;
  reconnect: () => void;
  lastActivity: number;
}

export const useWebSocket = (url: string): UseWebSocketReturn => {
  const socketRef = useRef<Socket<ServerEvents, ClientEvents> | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastActivity, setLastActivity] = useState(Date.now());
  const eventHandlersRef = useRef(new Map<keyof ServerEvents, ServerEvents[keyof ServerEvents]>());

  const updateActivity = useCallback(() => {
    setLastActivity(Date.now());
  }, []);

  const emit = useCallback(<K extends keyof ClientEvents>(
    event: K,
    ...args: Parameters<ClientEvents[K]>
  ) => {
    if (socketRef.current?.connected) {
      updateActivity();
      (socketRef.current.emit as any)(event, ...args);
    }
  }, [updateActivity]);

  const on = useCallback(<K extends keyof ServerEvents>(
    event: K,
    handler: ServerEvents[K]
  ) => {
    if (socketRef.current) {
      socketRef.current.on(event as any, handler as any);
      eventHandlersRef.current.set(event, handler);
    }
  }, []);

  const off = useCallback(<K extends keyof ServerEvents>(
    event: K,
    handler: ServerEvents[K]
  ) => {
    if (socketRef.current) {
      socketRef.current.off(event as any, handler as any);
      eventHandlersRef.current.delete(event);
    }
  }, []);

  const reconnect = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current.connect();
    }
  }, []);

  useEffect(() => {
    // Create socket connection
    const socket: Socket<ServerEvents, ClientEvents> = io(url, {
      autoConnect: false
    });

    socketRef.current = socket;

    // Connection event handlers
    const handleConnect = () => {
      setIsConnected(true);
      setError(null);
      updateActivity();
    };

    const handleDisconnect = () => {
      setIsConnected(false);
      updateActivity();
    };

    const handleError = (error: any) => {
      setError(typeof error === 'string' ? error : 'Connection error');
      setIsConnected(false);
      updateActivity();
    };

    const handleConnectError = (error: any) => {
      setError('Failed to connect to server');
      setIsConnected(false);
      updateActivity();
    };

    // Register connection event handlers
    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);
    socket.on('error', handleError);
    socket.on('connect_error', handleConnectError);

    // Connect
    socket.connect();

    // Cleanup function
    return () => {
      // Remove all event handlers
      eventHandlersRef.current.forEach((handler, event) => {
        socket.off(event as any, handler as any);
      });
      eventHandlersRef.current.clear();

      // Remove connection handlers
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      socket.off('error', handleError);
      socket.off('connect_error', handleConnectError);

      // Disconnect and cleanup
      socket.disconnect();
      socketRef.current = null;
    };
  }, [url, updateActivity]);

  // Activity heartbeat
  useEffect(() => {
    const interval = setInterval(() => {
      if (isConnected) {
        updateActivity();
      }
    }, 30000); // Update activity every 30 seconds

    return () => clearInterval(interval);
  }, [isConnected, updateActivity]);

  return {
    socket: socketRef.current,
    isConnected,
    error,
    emit,
    on,
    off,
    reconnect,
    lastActivity
  };
};