// Observed bugs/areas for improvement: 
// error screen on invalid moves [REMOVED - DONE]
// lack of notifications (for checkmating or possible optional helpful tips for potential moves),
// should allow toggling AI on/off or adjusting difficulty,
// css improvements

import React, { useEffect, useRef, useState } from 'react';
import { Chessboard } from 'react-chessboard';
import { Chess } from 'chess.js';

export default function ChessGame() {
  const [game, setGame] = useState(new Chess());
  const [fen, setFen] = useState(game.fen());
  const [status, setStatus] = useState('White to move');
  const [isAiThinking, setIsAiThinking] = useState(false);
  const [gameOver, setGameOver] = useState(false);

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

        const legalMoves = game.moves({ square: from, verbose: true });

        const moveExists = legalMoves.some(
          (move) => move.to === to
        );

        if (!moveExists) {
          console.error('Engine attempted illegal move:', { from, to });
          return;
        }

        game.move({ from, to, promotion });


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
  if (gameOver) return false;
  // 1️⃣ Get all legal moves from that square
  const legalMoves = game.moves({ square: sourceSquare, verbose: true });

  // 2️⃣ Check if any legal move matches the target square
  const moveExists = legalMoves.some(
    (move) => move.to === targetSquare
  );

  // 3️⃣ If no legal move exists, reject silently
  if (!moveExists) {
    return false; // this makes the piece snap back
  }

  // 4️⃣ Handle promotion if needed
  const piece = game.get(sourceSquare);
  const isPromotion =
    piece &&
    piece.type === 'p' &&
    ((piece.color === 'w' && targetSquare[1] === '8') ||
     (piece.color === 'b' && targetSquare[1] === '1'));

  // 5️⃣ Now apply the move (safe because we validated)
  game.move({
    from: sourceSquare,
    to: targetSquare,
    ...(isPromotion && { promotion: 'q' })
  });

  // 6️⃣ Update board + status
  setFen(game.fen());
  updateStatus(game);

  // 7️⃣ Ask engine to move
  if (engine.current) {
    setIsAiThinking(true);
    engine.current.postMessage(`position fen ${game.fen()}`);
    engine.current.postMessage('go depth 15');
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
    setStatus(
      `Checkmate! ${chessInstance.turn() === 'w' ? 'Black' : 'White'} wins`
    );
    setGameOver(true);
    setIsAiThinking(false);
  } else if (chessInstance.isStalemate()) {
    setStatus('Stalemate!');
    setGameOver(true);
    setIsAiThinking(false);
  } else if (chessInstance.inCheck()) {
    setStatus(
      `${chessInstance.turn() === 'w' ? 'White' : 'Black'} is in check`
    );
    setGameOver(false);
  } else {
    setStatus(
      `${chessInstance.turn() === 'w' ? 'White' : 'Black'} to move`
    );
    setGameOver(false);
  }
};


  const resetGame = () => {
    setGameOver(false);
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
        arePiecesDraggable={!isAiThinking && !gameOver}
      />
      <div style={{ marginTop: '1rem' }}>
        <button onClick={resetGame}>Reset Game</button>
      </div>
    </div>
  );
}