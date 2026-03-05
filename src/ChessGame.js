// Observed bugs/areas for improvement: 
// lack of notifications (for checkmating or possible optional helpful tips for potential moves),
// should allow toggling AI on/off or adjusting difficulty,
// css improvements

import React, { useEffect, useRef, useState } from 'react';
import { Chessboard } from 'react-chessboard';
import { Chess } from 'chess.js';

export default function ChessGame() {
  const gameRef = useRef(new Chess());
  const [fen, setFen] = useState(gameRef.current.fen());
  const [status, setStatus] = useState('White to move');
  const [isAiThinking, setIsAiThinking] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [highlightSquares, setHighlightSquares] = useState({});
  const [difficulty, setDifficulty] = useState(10); // 0–20 (10 = medium)

  useEffect(() => {
  if (!engine.current) return;

  engine.current.postMessage(
    `setoption name Skill Level value ${difficulty}`
  );
}, [difficulty]);

  const engine = useRef(null);
  const pendingEngineMove = useRef(null);
  const lastFen = useRef(null);
  const requestingHint = useRef(false);

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

        // ===== HINT MODE =====
        if (requestingHint.current) {
          requestingHint.current = false;

        setHighlightSquares({
          [from]: { backgroundColor: 'rgba(0, 120, 255, 0.6)' },
          [to]: { backgroundColor: 'rgba(0, 120, 255, 0.6)' },
        });

      return; // IMPORTANT: stop engine from making a move
}

        const legalMoves = gameRef.current.moves({ square: from, verbose: true });

        const moveExists = legalMoves.some(
          (move) => move.to === to
        );

        if (!moveExists) {
          console.error('Engine attempted illegal move:', { from, to });
          return;
        }

        gameRef.current.move({ from, to, promotion });


        setFen(gameRef.current.fen());
        updateStatus(gameRef.current);
        updateCheckHighlight(gameRef.current);
        lastFen.current = null;
        setIsAiThinking(false);
      }
    };

    engine.current.postMessage('uci');
    engine.current.postMessage(`setoption name Skill Level value ${difficulty}`);
    engine.current.postMessage('isready');

    return () => {
      engine.current.terminate();
    };
  }, []); // only run on mount

  const onPieceDrop = (sourceSquare, targetSquare) => {
  if (gameOver) return false;

  setHighlightSquares({});

  // 1️⃣ Get all legal moves from that square
  const legalMoves = gameRef.current.moves({ square: sourceSquare, verbose: true });

  // 2️⃣ Check if any legal move matches the target square
  const moveExists = legalMoves.some(
    (move) => move.to === targetSquare
  );

  // 3️⃣ If no legal move exists, reject silently
  if (!moveExists) {
    return false; // this makes the piece snap back
  }

  // 4️⃣ Handle promotion if needed
  const piece = gameRef.current.get(sourceSquare);
  const isPromotion =
    piece &&
    piece.type === 'p' &&
    ((piece.color === 'w' && targetSquare[1] === '8') ||
     (piece.color === 'b' && targetSquare[1] === '1'));

  // 5️⃣ Now apply the move (safe because we validated)
  gameRef.current.move({
    from: sourceSquare,
    to: targetSquare,
    ...(isPromotion && { promotion: 'q' })
  });

  // 6️⃣ Update board + status
  setFen(gameRef.current.fen());
  updateStatus(gameRef.current);
  updateCheckHighlight(gameRef.current);

  // 7️⃣ Ask engine to move
  if (engine.current) {
    setIsAiThinking(true);
    engine.current.postMessage(`position fen ${gameRef.current.fen()}`);
    engine.current.postMessage('go depth 15');
  }

  return true;
};

  const requestEngineMove = () => {
    const currentFen = gameRef.current.fen();
    engine.current.postMessage(`position fen ${currentFen}`);
    engine.current.postMessage('go depth 10');
  };

const requestHint = () => {
  if (!engine.current || gameOver || isAiThinking) return;

  requestingHint.current = true;

  engine.current.postMessage(`position fen ${gameRef.current.fen()}`);
  engine.current.postMessage('go depth 12');
};

const updateCheckHighlight = (chessInstance) => {
  if (!chessInstance.inCheck()) {
    setHighlightSquares({});
    return;
  }

  const board = chessInstance.board();
  const turn = chessInstance.turn(); // king currently under attack

  for (let rank = 0; rank < 8; rank++) {
    for (let file = 0; file < 8; file++) {
      const piece = board[rank][file];

      if (piece && piece.type === 'k' && piece.color === turn) {
        const square =
          String.fromCharCode(97 + file) + (8 - rank);

        setHighlightSquares({
          [square]: {
            backgroundColor: 'rgba(255, 0, 0, 0.45)',
          },
        });

        return;
      }
    }
  }
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
  if (engine.current) {
    engine.current.postMessage("stop");
    engine.current.postMessage("ucinewgame");
  }

  gameRef.current = new Chess();

  setFen(gameRef.current.fen());
  setStatus("White to move");
  setGameOver(false);
  setIsAiThinking(false);
  setHighlightSquares({});
};

  return (
    <div style={{ textAlign: 'center' }}>
      <h1>Chess Playground</h1>
      <p>{status} {isAiThinking ? ' — AI thinking...' : ''}</p>
      {gameOver && (
  <div
    style={{
      backgroundColor: '#1f1f1f',
      color: '#fff',
      padding: '14px',
      margin: '12px auto',
      borderRadius: '10px',
      width: 'fit-content',
      fontWeight: 'bold',
      fontSize: '18px',
      boxShadow: '0 4px 12px rgba(0,0,0,0.4)'
    }}
  >
    {status}
  </div>
)}

      <Chessboard
        position={fen}
        onPieceDrop={onPieceDrop}
        boardWidth={600}
        arePiecesDraggable={!isAiThinking && !gameOver}
        customSquareStyles={highlightSquares}
      />
      <div style={{ marginTop: '1rem' }}>
  <button onClick={resetGame}>Reset Game</button>

  <button
    onClick={requestHint}
    style={{ marginLeft: '10px' }}
  >
    Hint
  </button>

  <select
    value={difficulty}
    onChange={(e) => setDifficulty(Number(e.target.value))}
    style={{ marginLeft: '10px', padding: '4px' }}
    >
      <option value={5}>Easy</option>
      <option value={10}>Medium</option>
      <option value={15}>Hard</option>
      <option value={20}>Impossible</option>
    </select>
    </div>
  </div>
  );
}