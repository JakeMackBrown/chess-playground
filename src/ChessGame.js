// src/ChessGame.js
import React, { useState } from 'react';
import { Chessboard } from 'react-chessboard';
import { Chess } from 'chess.js';

export default function ChessGame() {
  const [game, setGame] = useState(new Chess());
  const [fen, setFen] = useState(game.fen());
  const [status, setStatus] = useState("White to move");
  const boardWidth = 600;

  function updateStatus() {
    if (game.isCheckmate()) {
      setStatus(`Checkmate! ${game.turn() === 'w' ? 'Black' : 'White'} wins`);
    } else if (game.isStalemate()) {
      setStatus("Stalemate!");
    } else if (game.inCheck()) {
      setStatus(`${game.turn() === 'w' ? 'White' : 'Black'} is in check`);
    } else {
      setStatus(`${game.turn() === 'w' ? 'White' : 'Black'} to move`);
    }
  }

  function onDrop(sourceSquare, targetSquare) {
    try {
      const move = game.move({
        from: sourceSquare,
        to: targetSquare,
        promotion: 'q',
      });

      if (move === null) {
        console.log("Illegal move attempted.");
        return false;
      }

      setFen(game.fen());
      updateStatus();
      return move;
    } catch (error) {
      console.error("Error processing move:", error);
      return false;
    }
  }

  function resetGame() {
    const newGame = new Chess();
    setGame(newGame);
    setFen(newGame.fen());
    setStatus("White to move");
  }

  return (
    <div>
      <h1 style={{ textAlign: 'center', marginBottom: '10px' }}>Chess Playground</h1>
      <p style={{ textAlign: 'center', fontSize: '1.2rem', marginBottom: '10px' }}>
        {status}
      </p>
      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <Chessboard
          position={fen}
          onPieceDrop={onDrop}
          boardWidth={boardWidth}
          boardStyle={{
            borderRadius: '8px',
            boxShadow: '0 5px 15px rgba(0, 0, 0, 0.3)',
          }}
        />
      </div>
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
