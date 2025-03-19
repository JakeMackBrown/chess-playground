// src/ChessGame.js
import React, { useState } from 'react';
import { Chessboard } from "react-chessboard";
import { Chess } from "chess.js";

export default function ChessGame() {
  // Initialize the Chess game instance
  const [game, setGame] = useState(new Chess());
  const [fen, setFen] = useState(game.fen());

  // Function gets triggered when a piece is dropped
  function onDrop(sourceSquare, targetSquare) {
    // Attempt the move, always promoting to queen for simplicity
    const move = game.move({
      from: sourceSquare,
      to: targetSquare,
      promotion: 'q',
    });

    // Illegal move, return false to snap the piece back
    if (move === null) return false;

    // Update the board state
    setFen(game.fen());
    
    // Future step: If move is legal, trigger your bot move here.
    // For now, we simply update the board.
    return true;
  }

  return (
    <div style={{ width: "400px", margin: "0 auto" }}>
      <h1>Chess Playground</h1>
      <Chessboard position={fen} onPieceDrop={onDrop} />
    </div>
  );
}
