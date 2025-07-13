// src/ChessGame.js
import React, { useState, useEffect, useRef } from 'react';
import { Chessboard } from 'react-chessboard';
import { Chess } from 'chess.js';

export default function ChessGame() {
  const [game, setGame] = useState(new Chess());
  const [fen, setFen] = useState(game.fen());
  const [status, setStatus] = useState("White to move");
  const [showUndo, setShowUndo] = useState(false);
  const [undoTimer, setUndoTimer] = useState(3);
  const undoInterval = useRef(null);
  const lastFen = useRef(null);

  const updateStatus = () => {
    if (game.isCheckmate()) {
      setStatus(`Checkmate! ${game.turn() === 'w' ? 'Black' : 'White'} wins`);
    } else if (game.isStalemate()) {
      setStatus("Stalemate!");
    } else if (game.inCheck()) {
      setStatus(`${game.turn() === 'w' ? 'White' : 'Black'} is in check`);
    } else {
      setStatus(`${game.turn() === 'w' ? 'White' : 'Black'} to move`);
    }
  };

  const onPieceDrop = (sourceSquare, targetSquare) => {
    // Save current FEN before move
    lastFen.current = game.fen();

    const piece = game.get(sourceSquare);
    const promotionNeeded =
      piece &&
      piece.type === 'p' &&
      ((piece.color === 'w' && targetSquare[1] === '8') ||
        (piece.color === 'b' && targetSquare[1] === '1'));

    let move;
    try {
      move = game.move({
        from: sourceSquare,
        to: targetSquare,
        promotion: promotionNeeded ? 'q' : undefined,
      });
    } catch (error) {
      // Invalid move caused an error, reject gracefully
      return false;
    }

    if (move === null) return false;

    setFen(game.fen());
    updateStatus();

    // Show undo option
    setUndoTimer(3);
    setShowUndo(true);

    clearInterval(undoInterval.current);
    undoInterval.current = setInterval(() => {
      setUndoTimer(prev => {
        if (prev <= 1) {
          clearInterval(undoInterval.current);
          setShowUndo(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return move;
  };

  const handleUndo = () => {
    if (!lastFen.current) return;

    game.load(lastFen.current);
    setFen(game.fen());
    updateStatus();
    setShowUndo(false);
    clearInterval(undoInterval.current);
  };

  const resetGame = () => {
    const newGame = new Chess();
    setGame(newGame);
    setFen(newGame.fen());
    setStatus("White to move");
    setShowUndo(false);
    clearInterval(undoInterval.current);
  };

  useEffect(() => {
    return () => {
      clearInterval(undoInterval.current); // Cleanup on unmount
    };
  }, []);

  return (
    <div onContextMenu={(e) => e.preventDefault()}>
      <h1 style={{ textAlign: 'center' }}>Chess Playground</h1>
      <p style={{ textAlign: 'center', marginBottom: '10px' }}>{status}</p>

      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <Chessboard
          position={fen}
          onPieceDrop={onPieceDrop}
          boardWidth={600}
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
              marginRight: '10px'
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
            cursor: 'pointer'
          }}
        >
          Reset Game
        </button>
      </div>
    </div>
  );
}
