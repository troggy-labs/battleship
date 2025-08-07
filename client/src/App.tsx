import { useEffect, useState } from 'react';
import { useWebSocket } from './hooks/useWebSocket';
import { useGameState } from './hooks/useGameState';
import { useShipPlacement } from './hooks/useShipPlacement';
import { useGameTimer } from './hooks/useGameTimer';
import { useLocalStorage } from './hooks/useLocalStorage';

import { GameBoard } from './components/GameBoard';
import { ShipPlacement } from './components/ShipPlacement';
import { GameTimer } from './components/GameTimer';
import { ConnectionStatus } from './components/ConnectionStatus';
import { GameOverScreen } from './components/GameOverScreen';

import { Position } from '../../shared/types';
import { createEmptyBoard, generateRandomShipPlacements } from '../../shared/utils';

import './styles/App.css';

const SERVER_URL = (import.meta as any).env.PROD 
  ? window.location.origin 
  : 'http://localhost:3001';

function App() {
  const [backgroundImage, setBackgroundImage] = useState<string>('');
  const [isInQueue, setIsInQueue] = useState(false);
  const [gameStarted, setGameStarted] = useState(false);
  const [reconnectGameId, setReconnectGameId] = useLocalStorage<string | null>('battleship-game-id', null);

  // WebSocket connection
  const { isConnected, error, emit, on, off } = useWebSocket(SERVER_URL);

  // Game state management
  const {
    game,
    playerId,
    isMyTurn,
    gamePhase,
    setGame,
    setPlayerId,
    getCurrentPlayer,
    getOpponent,
    updateShipPlacement,
    updateCellState,
    decrementShipsRemaining,
    areAllShipsPlaced,
    getTurnTimeRemaining
  } = useGameState();

  // Ship placement management
  const currentPlayer = getCurrentPlayer();
  const {
    selectedShip,
    shipOrientations,
    hoveredPosition,
    selectShip,
    deselectShip,
    rotateShip,
    setHoveredPosition,
    getPlacementPositions,
    canPlaceAt,
    getShipOrientation
  } = useShipPlacement(
    currentPlayer?.board.ships || [],
    currentPlayer?.board.grid || createEmptyBoard()
  );

  // Game timer
  const { timeRemaining, start: startTimer } = useGameTimer();

  // Socket event handlers
  useEffect(() => {
    if (!isConnected) return;

    const handleGameFound = (data: any) => {
      setPlayerId(data.playerId);
      setReconnectGameId(data.gameId);
      setIsInQueue(false);
      setGameStarted(true);
    };

    const handleGameState = (gameState: any) => {
      // Ensure opponent has a proper board structure
      const opponent = {
        ...gameState.opponent,
        board: gameState.opponent.board || {
          ships: [],
          grid: createEmptyBoard(),
          shipsRemaining: 5
        }
      };

      const reconstructedGame = {
        id: gameState.id,
        players: [gameState.player, opponent],
        currentPlayerId: gameState.currentPlayerId,
        phase: gameState.phase,
        winner: gameState.winner,
        background: gameState.background,
        createdAt: gameState.createdAt,
        turnTimer: gameState.turnTimer,
        turnStartTime: gameState.turnStartTime
      };
      
      setGame(reconstructedGame as any);
      
      if (gameState.background && gameState.background !== backgroundImage) {
        setBackgroundImage(gameState.background);
      }

      // Start turn timer if it's the playing phase
      if (gameState.phase === 'playing' && gameState.turnStartTime) {
        const remaining = getTurnTimeRemaining(reconstructedGame as any);
        if (remaining > 0) {
          startTimer(remaining);
        }
      }
    };

    const handleShipPlaced = (data: any) => {
      if (data.isValid && data.ship) {
        updateShipPlacement(data.ship.id, data.ship);
      } else if (data.error) {
        console.error('Ship placement error:', data.error);
      }
    };

    const handleShotResult = () => {
      // Shot results are now handled entirely by game state updates from server
    };

    const handleTurnChanged = (data: any) => {
      if (data.timeRemaining) {
        startTimer(data.timeRemaining);
      }
    };

    const handleGameEnded = (data: any) => {
      setReconnectGameId(null); // Clear saved game on end
    };

    const handleError = (error: string) => {
      console.error('Game error:', error);
    };

    // Register event handlers
    on('game-found', handleGameFound);
    on('game-state', handleGameState);
    on('ship-placed', handleShipPlaced);
    on('shot-result', handleShotResult);
    on('turn-changed', handleTurnChanged);
    on('game-ended', handleGameEnded);
    on('error', handleError);

    return () => {
      off('game-found', handleGameFound);
      off('game-state', handleGameState);
      off('ship-placed', handleShipPlaced);
      off('shot-result', handleShotResult);
      off('turn-changed', handleTurnChanged);
      off('game-ended', handleGameEnded);
      off('error', handleError);
    };
  }, [isConnected, isMyTurn, getCurrentPlayer, getOpponent, updateCellState, updateShipPlacement, decrementShipsRemaining, startTimer, getTurnTimeRemaining, on, off, setGame, setPlayerId, setReconnectGameId, backgroundImage]);

  // Attempt reconnection on load
  useEffect(() => {
    if (isConnected && reconnectGameId && !gameStarted) {
      emit('reconnect-game', reconnectGameId);
    }
  }, [isConnected, reconnectGameId, gameStarted, emit]);

  const handleJoinQueue = () => {
    if (isConnected) {
      setIsInQueue(true);
      emit('join-queue');
    }
  };

  const handleLeaveQueue = () => {
    if (isConnected) {
      setIsInQueue(false);
      emit('leave-queue');
    }
  };

  const handleShipPlace = (shipId: string, positions: Position[]) => {
    if (gamePhase === 'placement') {
      emit('place-ship', { shipId, positions });
    }
  };

  const handleShipRotate = (shipId: string) => {
    rotateShip(shipId);
  };

  const handleReadyToPlay = () => {
    if (areAllShipsPlaced() && gamePhase === 'placement') {
      emit('ready-to-play');
    }
  };

  const handleCellClick = (position: Position) => {
    if (gamePhase === 'placement' && selectedShip && !selectedShip.isPlaced) {
      // Place ship
      if (canPlaceAt(selectedShip, position)) {
        const positions = getPlacementPositions(selectedShip, position);
        handleShipPlace(selectedShip.id, positions);
        deselectShip();
      }
    } else if (gamePhase === 'playing' && isMyTurn) {
      // Fire shot
      emit('fire-shot', position);
    }
  };

  const handleCellHover = (position: Position | null) => {
    if (gamePhase === 'placement') {
      setHoveredPosition(position);
    }
  };

  const handleCellDrop = (position: Position, shipId: string) => {
    if (gamePhase === 'placement') {
      // Find the ship being dropped
      const ship = currentPlayer?.board.ships.find(s => s.id === shipId);
      if (ship && !ship.isPlaced) {
        if (canPlaceAt(ship, position)) {
          const positions = getPlacementPositions(ship, position);
          handleShipPlace(shipId, positions);
          deselectShip();
        }
      }
    }
  };

  const handleCellDragOver = (position: Position) => {
    if (gamePhase === 'placement') {
      setHoveredPosition(position);
    }
  };

  const handleAutoPlace = () => {
    if (gamePhase === 'placement' && currentPlayer) {
      const autoPlacedShips = generateRandomShipPlacements(currentPlayer.board.ships);
      
      // Place each ship via the server
      autoPlacedShips.forEach(ship => {
        if (ship.isPlaced) {
          handleShipPlace(ship.id, ship.positions);
        }
      });
      
      deselectShip();
    }
  };

  const handleNewGame = () => {
    setReconnectGameId(null);
    setGame(null);
    setPlayerId(null);
    setGameStarted(false);
    setBackgroundImage('');
    deselectShip();
  };

  const getBackgroundStyle = () => {
    if (backgroundImage) {
      return {
        backgroundImage: `linear-gradient(rgba(0, 0, 0, 0.1), rgba(0, 0, 0, 0.1)), url(${backgroundImage})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed'
      };
    }
    return {};
  };

  return (
    <div className="app" style={getBackgroundStyle()}>
      <ConnectionStatus 
        isConnected={isConnected} 
        error={error} 
      />
      
      <header className="app-header">
        <h1>⚓ Battleship ⚓</h1>
      </header>

      <main className="app-main">
        {!gameStarted && (
          <div className="menu-screen">
            <div className="menu-content">
              <h2>Welcome Admiral!</h2>
              <p>Challenge another player to a battle on the high seas.</p>
              
              {!isInQueue ? (
                <button 
                  className="join-queue-button"
                  onClick={handleJoinQueue}
                  disabled={!isConnected}
                >
                  🚢 Find Battle
                </button>
              ) : (
                <div className="queue-status">
                  <div className="loading-spinner">⚡</div>
                  <p>Searching for opponent...</p>
                  <button 
                    className="cancel-button"
                    onClick={handleLeaveQueue}
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {gameStarted && gamePhase === 'placement' && (
          <div className="placement-screen">
            <div className="placement-content">
              <ShipPlacement
                ships={currentPlayer?.board.ships || []}
                onShipPlace={handleShipPlace}
                onRotate={handleShipRotate}
                onReady={handleReadyToPlay}
                onAutoPlace={handleAutoPlace}
                allShipsPlaced={areAllShipsPlaced()}
                shipOrientations={shipOrientations}
                onShipSelect={selectShip}
                selectedShip={selectedShip}
              />
              
              <div className="board-container">
                <h3>Your Fleet</h3>
                <GameBoard
                  board={currentPlayer?.board.grid || createEmptyBoard()}
                  ships={currentPlayer?.board.ships || []}
                  isOwner={true}
                  onCellClick={handleCellClick}
                  onCellDrop={handleCellDrop}
                  onCellDragOver={handleCellDragOver}
                  interactive={true}
                  placementMode={true}
                  hoveredShip={selectedShip ? {
                    type: selectedShip.type,
                    size: selectedShip.size
                  } : undefined}
                  hoverPosition={hoveredPosition}
                  hoverDirection={selectedShip ? getShipOrientation(selectedShip.id) : 'horizontal'}
                />
              </div>
            </div>
          </div>
        )}

        {gameStarted && gamePhase === 'playing' && (
          <div className="battle-screen">
            <div className="battle-header">
              <GameTimer
                timeRemaining={timeRemaining}
                isActive={true}
                isMyTurn={isMyTurn}
              />
              <h2>{isMyTurn ? 'Your Turn - Fire!' : 'Opponent\'s Turn'}</h2>
            </div>
            
            <div className="battle-boards">
              <div className="board-section">
                <h3>Enemy Waters</h3>
                <GameBoard
                  board={getOpponent()?.board?.grid || createEmptyBoard()}
                  ships={getOpponent()?.board?.ships || []}
                  isOwner={false}
                  onCellClick={isMyTurn ? handleCellClick : undefined}
                  interactive={isMyTurn}
                />
                <div style={{fontSize: '10px', marginTop: '5px'}}>
                  Opponent ID: {getOpponent()?.id}
                </div>
              </div>
              
              <div className="board-section">
                <h3>Your Fleet</h3>
                <GameBoard
                  board={currentPlayer?.board.grid || createEmptyBoard()}
                  ships={currentPlayer?.board.ships || []}
                  isOwner={true}
                  interactive={false}
                />
              </div>
            </div>
          </div>
        )}

        {gameStarted && gamePhase === 'finished' && game && (
          <GameOverScreen
            game={game}
            playerId={playerId || ''}
            onNewGame={handleNewGame}
          />
        )}
      </main>
    </div>
  );
}

export default App;