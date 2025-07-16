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
        const moveStr = message.split(' ')[1];
        pendingEngineMove.current = moveStr;

        if (!moveStr || moveStr === '(none)') return;

        const from = moveStr.substring(0, 2);
        const to = moveStr.substring(2, 4);
        const promotion = moveStr.length > 4 ? moveStr[4] : undefined;

        const legalMove = game.move({ from, to, promotion });

        if (legalMove === null) {
          console.error('Illegal engine move:', { from, to, promotion });
          return;
        }

        setFen(game.fen());
        updateStatus(game);
        lastFen.current = null;
        setIsAiThinking(false);
      }
    };

    engine.current.postMessage('uci');
    engine.current.postMessage('isready');

    return () => {
      engine.current.terminate();
    };
  }, []); // only run on mount

  const onPieceDrop = (sourceSquare, targetSquare) => {
    if (isAiThinking || game.isGameOver()) return false;

    lastFen.current = game.fen();

    const move = game.move({
      from: sourceSquare,
      to: targetSquare,
      promotion: 'q',
    });

    if (move === null) return false;

    setFen(game.fen());
    updateStatus(game);

    if (!game.isGameOver()) {
      setIsAiThinking(true);
      requestEngineMove();
    }

    return true;
  };

  const requestEngineMove = () => {
    const currentFen = game.fen();
    engine.current.postMessage(`position fen ${currentFen}`);
    engine.current.postMessage('go depth 10');
  };

  const updateStatus = (chessInstance) => {
    if (chessInstance.isCheckmate()) {
      setStatus(`Checkmate! ${chessInstance.turn() === 'w' ? 'Black' : 'White'} wins`);
    } else if (chessInstance.isStalemate()) {
      setStatus('Stalemate!');
    } else if (chessInstance.inCheck()) {
      setStatus(`${chessInstance.turn() === 'w' ? 'White' : 'Black'} is in check`);
    } else {
      setStatus(`${chessInstance.turn() === 'w' ? 'White' : 'Black'} to move`);
    }
  };

  const resetGame = () => {
    const newGame = new Chess();
    setGame(newGame);
    setFen(newGame.fen());
    setStatus('White to move');
    lastFen.current = null;

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
