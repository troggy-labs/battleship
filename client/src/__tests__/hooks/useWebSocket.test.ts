import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useWebSocket } from '../../hooks/useWebSocket';
import { io } from 'socket.io-client';

// Mock socket.io-client
vi.mock('socket.io-client', () => ({
  io: vi.fn(() => ({
    connect: vi.fn(),
    disconnect: vi.fn(),
    on: vi.fn(),
    off: vi.fn(),
    emit: vi.fn(),
    connected: false
  }))
}));

describe('useWebSocket', () => {
  let mockSocket: any;

  beforeEach(() => {
    mockSocket = {
      connect: vi.fn(),
      disconnect: vi.fn(),
      on: vi.fn(),
      off: vi.fn(),
      emit: vi.fn(),
      connected: false
    };
    (io as any).mockReturnValue(mockSocket);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should initialize socket connection', () => {
    renderHook(() => useWebSocket('http://localhost:3001'));

    expect(io).toHaveBeenCalledWith('http://localhost:3001', {
      autoConnect: false
    });
  });

  it('should connect socket on mount', () => {
    renderHook(() => useWebSocket('http://localhost:3001'));

    expect(mockSocket.connect).toHaveBeenCalled();
  });

  it('should disconnect socket on unmount', () => {
    const { unmount } = renderHook(() => useWebSocket('http://localhost:3001'));

    unmount();

    expect(mockSocket.disconnect).toHaveBeenCalled();
  });

  it('should register event listeners', () => {
    renderHook(() => useWebSocket('http://localhost:3001'));

    // Should register for connection events
    expect(mockSocket.on).toHaveBeenCalledWith('connect', expect.any(Function));
    expect(mockSocket.on).toHaveBeenCalledWith('disconnect', expect.any(Function));
    expect(mockSocket.on).toHaveBeenCalledWith('error', expect.any(Function));
  });

  it('should update connection status on connect', () => {
    const { result } = renderHook(() => useWebSocket('http://localhost:3001'));

    // Simulate connection
    const connectHandler = mockSocket.on.mock.calls.find(
      call => call[0] === 'connect'
    )[1];

    act(() => {
      mockSocket.connected = true;
      connectHandler();
    });

    expect(result.current.isConnected).toBe(true);
  });

  it('should update connection status on disconnect', () => {
    const { result } = renderHook(() => useWebSocket('http://localhost:3001'));

    // Simulate connection first
    act(() => {
      mockSocket.connected = true;
      const connectHandler = mockSocket.on.mock.calls.find(
        call => call[0] === 'connect'
      )[1];
      connectHandler();
    });

    expect(result.current.isConnected).toBe(true);

    // Simulate disconnection
    act(() => {
      mockSocket.connected = false;
      const disconnectHandler = mockSocket.on.mock.calls.find(
        call => call[0] === 'disconnect'
      )[1];
      disconnectHandler();
    });

    expect(result.current.isConnected).toBe(false);
  });

  it('should handle connection errors', () => {
    const { result } = renderHook(() => useWebSocket('http://localhost:3001'));

    const errorHandler = mockSocket.on.mock.calls.find(
      call => call[0] === 'error'
    )[1];

    act(() => {
      errorHandler('Connection failed');
    });

    expect(result.current.error).toBe('Connection failed');
  });

  it('should emit events through socket', () => {
    const { result } = renderHook(() => useWebSocket('http://localhost:3001'));

    act(() => {
      result.current.emit('join-queue');
    });

    expect(mockSocket.emit).toHaveBeenCalledWith('join-queue');
  });

  it('should emit events with data', () => {
    const { result } = renderHook(() => useWebSocket('http://localhost:3001'));

    const testData = { playerId: 'player1', position: { row: 5, col: 5 } };

    act(() => {
      result.current.emit('fire-shot', testData);
    });

    expect(mockSocket.emit).toHaveBeenCalledWith('fire-shot', testData);
  });

  it('should register custom event listeners', () => {
    const { result } = renderHook(() => useWebSocket('http://localhost:3001'));
    const mockHandler = vi.fn();

    act(() => {
      result.current.on('game-found', mockHandler);
    });

    expect(mockSocket.on).toHaveBeenCalledWith('game-found', mockHandler);
  });

  it('should unregister event listeners', () => {
    const { result } = renderHook(() => useWebSocket('http://localhost:3001'));
    const mockHandler = vi.fn();

    act(() => {
      result.current.on('game-found', mockHandler);
      result.current.off('game-found', mockHandler);
    });

    expect(mockSocket.off).toHaveBeenCalledWith('game-found', mockHandler);
  });

  it('should clean up event listeners on unmount', () => {
    const { result, unmount } = renderHook(() => useWebSocket('http://localhost:3001'));
    const mockHandler = vi.fn();

    act(() => {
      result.current.on('game-found', mockHandler);
    });

    unmount();

    expect(mockSocket.off).toHaveBeenCalledWith('game-found', mockHandler);
  });

  it('should handle reconnection attempts', () => {
    const { result } = renderHook(() => useWebSocket('http://localhost:3001'));

    act(() => {
      result.current.reconnect();
    });

    expect(mockSocket.disconnect).toHaveBeenCalled();
    expect(mockSocket.connect).toHaveBeenCalledTimes(2); // Initial + reconnect
  });

  it('should track last activity', () => {
    const { result } = renderHook(() => useWebSocket('http://localhost:3001'));

    const initialTime = result.current.lastActivity;

    act(() => {
      result.current.emit('join-queue');
    });

    expect(result.current.lastActivity).toBeGreaterThanOrEqual(initialTime);
  });
});