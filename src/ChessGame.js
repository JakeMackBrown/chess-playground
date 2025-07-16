// src/ChessGame.js
import React, { useState, useEffect, useRef } from 'react';
import { Chessboard } from 'react-chessboard';
import { Chess } from 'chess.js';
// no import — we load it as a web worker from public folder


export default function ChessGame() {
  /* ---------------------------- state & refs --------------------------- */
  const [game, setGame] = useState(new Chess());
  const [fen, setFen] = useState(game.fen());
  const [status, setStatus] = useState('White to move');
  const [showUndo, setShowUndo] = useState(false);
  const [undoTimer, setUndoTimer] = useState(3);
  const [isAiThinking, setIsAiThinking] = useState(false);

  const undoInterval = useRef(null);
  const lastFen = useRef(null); // stores FEN *before* the player‟s last move
  const engine = useRef(null); // Stockfish instance
  const pendingEngineMove = useRef(null);

  /* --------------------------- engine setup ---------------------------- */
  useEffect(() => {
  const worker = new Worker('/stockfish.js'); // served from public folder
  engine.current = worker;

  worker.onmessage = (event) => {
    const line = typeof event === 'object' ? event.data : event;
    if (line.startsWith('bestmove')) {
      pendingEngineMove.current = line.split(' ')[1];
      makeEngineMove();
    }
  };

  worker.postMessage('uci');
  worker.postMessage('setoption name Skill Level value 6');
  worker.postMessage('isready');

  return () => worker.terminate();
}, []);


  /* ------------------------- helpers & UI text ------------------------- */
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

  const isPromotionNeeded = (piece, target) =>
    piece.type === 'p' && ((piece.color === 'w' && target[1] === '8') || (piece.color === 'b' && target[1] === '1'));

  /* ----------------------------- gameplay ------------------------------ */
  const onPieceDrop = (source, target) => {
    if (isAiThinking) return false; // block user while AI thinking

    lastFen.current = game.fen();

    const piece = game.get(source);
    const move = game.move({
      from: source,
      to: target,
      promotion: isPromotionNeeded(piece, target) ? 'q' : undefined,
    });

    if (move === null) return false; // illegal move

    setFen(game.fen());
    updateStatus();

    // undo UI (3‑second window)
    setUndoTimer(3);
    setShowUndo(true);
    clearInterval(undoInterval.current);
    undoInterval.current = setInterval(() => {
      setUndoTimer((prev) => {
        if (prev <= 1) {
          clearInterval(undoInterval.current);
          setShowUndo(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    // ask AI for reply
    if (!game.isGameOver()) {
      setIsAiThinking(true);
      requestEngineMove();
    }

    return move;
  };

  const requestEngineMove = () => {
    engine.current.postMessage(`position fen ${game.fen()}`);
    engine.current.postMessage('go depth 10'); // ~1‑2 seconds, decent strength
  };

  const makeEngineMove = () => {
    setIsAiThinking(false);
    const moveStr = pendingEngineMove.current;
    if (!moveStr || moveStr === '(none)') return;

    const from = moveStr.slice(0, 2);
    const to = moveStr.slice(2, 4);
    const promo = moveStr.length > 4 ? moveStr[4] : undefined;

    game.move({ from, to, promotion: promo });
    setFen(game.fen());
    updateStatus();

    // prevent undoing both moves in one click
    lastFen.current = null;
  };

  /* --------------------------- UI handlers ----------------------------- */
  const handleUndo = () => {
    if (!lastFen.current || isAiThinking) return;
    game.load(lastFen.current);
    lastFen.current = null;
    setFen(game.fen());
    updateStatus();
    setShowUndo(false);
    clearInterval(undoInterval.current);
  };

  const resetGame = () => {
    const fresh = new Chess();
    setGame(fresh);
    setFen(fresh.fen());
    setStatus('White to move');
    setShowUndo(false);
    clearInterval(undoInterval.current);
  };

  /* -------------------------- cleanup timer --------------------------- */
  useEffect(() => () => clearInterval(undoInterval.current), []);

  /* ----------------------------- render ------------------------------- */
  return (
    <div onContextMenu={(e) => e.preventDefault()}>
      <h1 style={{ textAlign: 'center' }}>Chess Playground</h1>
      <p style={{ textAlign: 'center', marginBottom: '10px' }}>
        {status}
        {isAiThinking ? ' — AI thinking…' : ''}
      </p>

      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <Chessboard
          position={fen}
          onPieceDrop={onPieceDrop}
          boardWidth={600}
          arePiecesDraggable={!isAiThinking}
        />
      </div>

      {showUndo && (
        <div style={{ textAlign: 'center', marginTop: '15px' }}>
          <button
            onClick={handleUndo}
            style={{
              padding: '10px 20px',
              fontSize: '1rem',
              borderRadius: '5px',
              border: 'none',
              backgroundColor: '#f44336',
              color: '#fff',
              cursor: 'pointer',
              marginRight: '10px',
            }}
          >
            Undo Move ({undoTimer})
          </button>
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'center', marginTop: '20px' }}>
        <button
          onClick={resetGame}
          style={{
            padding: '10px 20px',
            fontSize: '1rem',
            borderRadius: '5px',
            border: 'none',
            backgroundColor: '#4CAF50',
            color: '#fff',
            cursor: 'pointer',
          }}
        >
          Reset Game
        </button>
      </div>
    </div>
  );
}
