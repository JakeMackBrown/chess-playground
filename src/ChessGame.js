// src/ChessGame.js
import React, { useState } from 'react';
import { Chessboard } from 'react-chessboard';
import { Chess } from 'chess.js';

export default function ChessGame() {
  const [game, setGame] = useState(new Chess());
  const [fen, setFen] = useState(game.fen());
  const boardWidth = 600; // Adjust the board size as desired

  function onDrop(sourceSquare, targetSquare) {
    try {
      const move = game.move({
        from: sourceSquare,
        to: targetSquare,
        promotion: 'q', // Always promote to queen for simplicity
      });

      if (move === null) {
        console.log("Illegal move attempted.");
        return false;
      }
      
      setFen(game.fen());
      return move;
    } catch (error) {
      console.error("Error processing move:", error);
      return false;
    }
  }

  return (
    <div>
      <h1 style={{ textAlign: 'center', marginBottom: '20px' }}>
        Chess Playground
      </h1>
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
  );
}
