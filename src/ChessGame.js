import React, { useEffect, useRef, useState } from 'react';
import { Chessboard } from 'react-chessboard';
import { Chess } from 'chess.js';

export default function ChessGame() {
  const [game, setGame] = useState(new Chess());
  const [fen, setFen] = useState(game.fen());
  const [status, setStatus] = useState('White to move');
  const [isAiThinking, setIsAiThinking] = useState(false);

  const engine = useRef(null);
  const pendingEngineMove = useRef(null);
  const lastFen = useRef(null);

  // Start Stockfish engine
  useEffect(() => {
    engine.current = new Worker('/stockfish/stockfish-nnue-16-single.js');

    engine.current.onmessage = (event) => {
      const message = event.data;
      if (message.startsWith('bestmove')) {
        const bestMove = message.split(' ')[1];
        pendingEngineMove.current = bestMove;
        makeEngineMove();
      }
    };

    engine.current.postMessage('uci');
    engine.current.postMessage('isready');

    return () => {
      engine.current.terminate();
    };
  }, []);

  const onPieceDrop = (sourceSquare, targetSquare) => {
    if (isAiThinking || game.isGameOver()) return false;

    lastFen.current = game.fen();

    const move = game.move({
      from: sourceSquare,
      to: targetSquare,
      promotion: 'q', // always queen for now
    });

    if (move === null) return false;

    setFen(game.fen());
    updateStatus();

    if (!game.isGameOver()) {
      setIsAiThinking(true);
      requestEngineMove();
    }

    return true;
  };

  const requestEngineMove = () => {
    const currentFen = game.fen();
    engine.current.postMessage(`position fen ${currentFen}`);
    engine.current.postMessage('go depth 10'); // Adjust for difficulty/speed
  };

  const makeEngineMove = () => {
    setIsAiThinking(false);

    const moveStr = pendingEngineMove.current;
    if (!moveStr || moveStr === '(none)') return;

    const from = moveStr.substring(0, 2);
    const to = moveStr.substring(2, 4);
    const promotion = moveStr.length > 4 ? moveStr[4] : undefined;

    game.move({ from, to, promotion });
    setFen(game.fen());
    updateStatus();

    lastFen.current = null;
  };

  const updateStatus = () => {
    if (game.isCheckmate()) {
      setStatus(`Checkmate! ${game.turn() === 'w' ? 'Black' : 'White'} wins`);
    } else if (game.isStalemate()) {
      setStatus('Stalemate!');
    } else if (game.inCheck()) {
      setStatus(`${game.turn() === 'w' ? 'White' : 'Black'} is in check`);
    } else {
      setStatus(`${game.turn() === 'w' ? 'White' : 'Black'} to move`);
    }
  };

  const resetGame = () => {
    const newGame = new Chess();
    setGame(newGame);
    setFen(newGame.fen());
    setStatus('White to move');
    lastFen.current = null;

    // Ask AI to move if it's black's turn to start
    if (newGame.turn() === 'b') {
      setIsAiThinking(true);
      requestEngineMove();
    }
  };

  return (
    <div style={{ textAlign: 'center' }}>
      <h1>Chess Playground</h1>
      <p>{status} {isAiThinking ? ' — AI thinking...' : ''}</p>
      <Chessboard
        position={fen}
        onPieceDrop={onPieceDrop}
        boardWidth={600}
        arePiecesDraggable={!isAiThinking}
      />
      <div style={{ marginTop: '1rem' }}>
        <button onClick={resetGame}>Reset Game</button>
      </div>
    </div>
  );
}
