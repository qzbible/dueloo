import React, { useState, useEffect, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { motion, AnimatePresence } from 'framer-motion';

const Checkers = ({ onSubmit, duelMode, opponentMove, onMove, bothReady }) => {
  const [board, setBoard] = useState(initialBoard());
  const [turn, setTurn] = useState('B'); // B for Black (Player), W for White (AI)
  const [selected, setSelected] = useState(null);
  const [validMoves, setValidMoves] = useState([]);
  const [winner, setWinner] = useState(null);

  function initialBoard() {
    let b = Array(8).fill(null).map(() => Array(8).fill(null));
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 8; c++) {
        if ((r + c) % 2 !== 0) b[r][c] = { color: 'W', king: false };
      }
    }
    for (let r = 5; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        if ((r + c) % 2 !== 0) b[r][c] = { color: 'B', king: false };
      }
    }
    return b;
  }

  const getMoves = useCallback((b, r, c, isAI = false) => {
    const piece = b[r][c];
    if (!piece) return [];
    const color = piece.color;
    const moves = [];
    const directions = piece.king ? [[1,1], [1,-1], [-1,1], [-1,-1]] : (color === 'B' ? [[-1,1], [-1,-1]] : [[1,1], [1,-1]]);

    // Simple moves
    directions.forEach(([dr, dc]) => {
      const nr = r + dr, nc = c + dc;
      if (nr >= 0 && nr < 8 && nc >= 0 && nc < 8 && !b[nr][nc]) {
        moves.push({ r: nr, c: nc, capture: null });
      }
    });

    // Captures
    directions.forEach(([dr, dc]) => {
      const mr = r + dr, mc = c + dc;
      const fr = r + 2*dr, fc = c + 2*dc;
      if (fr >= 0 && fr < 8 && fc >= 0 && fc < 8 && b[mr][mc] && b[mr][mc].color !== color && !b[fr][fc]) {
        moves.push({ r: fr, c: fc, capture: { r: mr, c: mc } });
      }
    });

    return moves;
  }, []);

  const selectPiece = (r, c) => {
    const myColor = duelMode ? (duelMode.role === 'player1' ? 'B' : 'W') : 'B';
    const isMyTurn = !duelMode || (bothReady && turn === myColor);

    if (winner || !isMyTurn || board[r][c]?.color !== myColor) return;
    setSelected({ r, c });
    setValidMoves(getMoves(board, r, c));
  };

  const movePiece = (nr, nc) => {
    const move = validMoves.find(m => m.r === nr && m.c === nc);
    if (!move) return;

    if (duelMode) {
      onMove({ type: 'move', from: selected, to: { r: nr, c: nc }, move });
    }

    applyMove(selected, { r: nr, c: nc }, move);
  };

  const applyMove = (from, to, move) => {
    let newBoard = board.map(row => [...row]);
    const piece = newBoard[from.r][from.c];
    newBoard[to.r][to.c] = piece;
    newBoard[from.r][from.c] = null;

    if (move.capture) {
      newBoard[move.capture.r][move.capture.c] = null;
    }

    if (to.r === 0 && piece.color === 'B') piece.king = true;
    if (to.r === 7 && piece.color === 'W') piece.king = true;

    setBoard(newBoard);
    setSelected(null);
    setValidMoves([]);
    checkEnd(newBoard);
    setTurn(piece.color === 'B' ? 'W' : 'B');
  };

  const checkEnd = (b) => {
      const players = { B: 0, W: 0 };
      b.forEach(row => row.forEach(cell => { if(cell) players[cell.color]++; }));
      if(players.B === 0) setWinner('W');
      if(players.W === 0) setWinner('B');
  };

  useEffect(() => {
    if (winner) {
        const myColor = duelMode ? (duelMode.role === 'player1' ? 'B' : 'W') : 'B';
        setTimeout(() => onSubmit({ won: winner === myColor }), 2000);
    }
  }, [winner, onSubmit, duelMode]);

  const makeAIMove = useCallback(() => {
    let allMoves = [];
    board.forEach((row, r) => row.forEach((cell, c) => {
      if (cell?.color === 'W') {
        const moves = getMoves(board, r, c, true);
        moves.forEach(m => allMoves.push({ from: { r, c }, to: { r: m.r, c: m.c }, ...m }));
      }
    }));

    if (allMoves.length === 0) { setWinner('B'); return; }

    // Prioritize captures
    const captures = allMoves.filter(m => m.capture);
    const move = (captures.length > 0 ? captures : allMoves)[Math.floor(Math.random() * (captures.length > 0 ? captures.length : allMoves.length))];

    applyMove(move.from, move.to, move);
  }, [board, getMoves]);

  useEffect(() => {
    if (!duelMode && turn === 'W' && !winner) {
      const timer = setTimeout(makeAIMove, 1000);
      return () => clearTimeout(timer);
    }
  }, [turn, winner, makeAIMove, duelMode]);

  useEffect(() => {
    if (duelMode && opponentMove && opponentMove.type === 'move') {
      const { from, to, move } = opponentMove;
      applyMove(from, to, move);
    }
  }, [opponentMove]);

  return (
    <div className="max-w-md mx-auto">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-black text-white mb-2">Damier</h2>
        <p className="text-blue-200">
          {winner ? (
            winner === 'T' ? "Égalité !" : 
            duelMode ? (winner === (duelMode.role === 'player1' ? 'B' : 'W') ? "Victoire !" : "Défaite !") :
            (winner === 'B' ? "Victoire !" : "Défaite !")
          ) : (
            duelMode ? (
                (duelMode.role === 'player1' ? turn === 'B' : turn === 'W') ? "À vous" : "Attente de l'adversaire..."
            ) : (
                turn === 'B' ? "À vous" : "L'IA joue..."
            )
          )}
        </p>
      </div>

      <Card className="p-2 bg-amber-900 shadow-2xl border-4 border-amber-800 aspect-square">
        <div className="grid grid-cols-8 grid-rows-8 h-full">
          {board.map((row, r) => row.map((cell, c) => {
            const isValid = validMoves.some(m => m.r === r && m.c === c);
            const isSelected = selected?.r === r && selected?.c === c;
            return (
              <div
                key={`${r}-${c}`}
                onClick={() => isValid ? movePiece(r, c) : selectPiece(r, c)}
                className={`flex items-center justify-center relative
                  ${(r + c) % 2 === 0 ? 'bg-[#ffce9e]' : 'bg-[#d18b47]'}
                  ${isValid ? 'after:content-[""] after:w-4 after:h-4 after:bg-green-500/50 after:rounded-full' : ''}`}
              >
                {cell && (
                  <motion.div
                    layoutId={`${r}-${c}`}
                    className={`w-10 h-10 rounded-full shadow-lg flex items-center justify-center cursor-pointer
                      ${cell.color === 'B' ? 'bg-zinc-800' : 'bg-zinc-100'}
                      ${isSelected ? 'ring-4 ring-blue-500' : ''}`}
                  >
                    {cell.king && <span className="text-yellow-500">👑</span>}
                  </motion.div>
                )}
              </div>
            );
          }))}
        </div>
      </Card>
    </div>
  );
};

export default Checkers;
