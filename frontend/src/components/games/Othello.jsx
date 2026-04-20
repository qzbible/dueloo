import React, { useState, useEffect, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { motion, AnimatePresence } from 'framer-motion';

const Othello = ({ onSubmit, duelMode, opponentMove, onMove, bothReady }) => {
  const [board, setBoard] = useState(initialBoard());
  const [turn, setTurn] = useState('B'); // B for Black (Player), W for White (AI)
  const [winner, setWinner] = useState(null);
  const [scores, setScores] = useState({ B: 2, W: 2 });

  function initialBoard() {
    let b = Array(8).fill(null).map(() => Array(8).fill(null));
    b[3][3] = 'W'; b[4][4] = 'W';
    b[3][4] = 'B'; b[4][3] = 'B';
    return b;
  }

  const getFlippedPieces = (b, r, c, color) => {
    if (b[r][c]) return [];
    const opponent = color === 'B' ? 'W' : 'B';
    const directions = [[0,1], [0,-1], [1,0], [-1,0], [1,1], [1,-1], [-1,1], [-1,-1]];
    let totalFlipped = [];

    directions.forEach(([dr, dc]) => {
      let flippedInDir = [];
      let currR = r + dr, currC = c + dc;
      while (currR >= 0 && currR < 8 && currC >= 0 && currC < 8 && b[currR][currC] === opponent) {
        flippedInDir.push({ r: currR, c: currC });
        currR += dr;
        currC += dc;
      }
      if (currR >= 0 && currR < 8 && currC >= 0 && currC < 8 && b[currR][currC] === color) {
        totalFlipped = [...totalFlipped, ...flippedInDir];
      }
    });
    return totalFlipped;
  };

  const getValidMoves = useCallback((b, color) => {
    let moves = [];
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const flipped = getFlippedPieces(b, r, c, color);
        if (flipped.length > 0) moves.push({ r, c, flipped });
      }
    }
    return moves;
  }, []);

  const handleClick = (r, c) => {
    const isMyTurn = !duelMode || (bothReady && (duelMode.role === 'player1' ? turn === 'B' : turn === 'W'));
    const myColor = duelMode ? (duelMode.role === 'player1' ? 'B' : 'W') : 'B';
    
    if (winner || !isMyTurn) return;
    const flipped = getFlippedPieces(board, r, c, myColor);
    if (flipped.length === 0) return;

    if (duelMode) onMove({ type: 'move', r, c, flipped, color: myColor });
    applyMove(r, c, flipped, myColor);
  };

  const applyMove = (r, c, flipped, color) => {
    let newBoard = board.map(row => [...row]);
    newBoard[r][c] = color;
    flipped.forEach(p => newBoard[p.r][p.c] = color);
    
    setBoard(newBoard);
    updateScores(newBoard);
    
    const nextColor = color === 'B' ? 'W' : 'B';
    const nextMoves = getValidMoves(newBoard, nextColor);
    
    if (nextMoves.length > 0) {
      setTurn(nextColor);
    } else {
      const otherMoves = getValidMoves(newBoard, color);
      if (otherMoves.length === 0) {
        endGame(newBoard);
      } else {
        // Skip turn
        setTurn(color);
      }
    }
  };

  const updateScores = (b) => {
    let s = { B: 0, W: 0 };
    b.forEach(row => row.forEach(cell => { if(cell) s[cell]++; }));
    setScores(s);
  };

  const endGame = (b) => {
    let s = { B: 0, W: 0 };
    b.forEach(row => row.forEach(cell => { if(cell) s[cell]++; }));
    if (s.B > s.W) setWinner('B');
    else if (s.W > s.B) setWinner('W');
    else setWinner('T');
  };

  useEffect(() => {
    if (winner) {
        const myColor = duelMode ? (duelMode.role === 'player1' ? 'B' : 'W') : 'B';
        setTimeout(() => onSubmit({ won: winner === myColor }), 2000);
    }
  }, [winner, onSubmit, duelMode]);

  const makeAIMove = useCallback(() => {
    const validMoves = getValidMoves(board, 'W');
    if (validMoves.length === 0) {
        const nextMoves = getValidMoves(board, 'B');
        if(nextMoves.length === 0) endGame(board);
        else setTurn('B');
        return;
    }

    // Heuristic: corners > edges > max flips
    const scoreMove = (m) => {
      let s = m.flipped.length;
      if ((m.r === 0 || m.r === 7) && (m.c === 0 || m.c === 7)) s += 50;
      else if (m.r === 0 || m.r === 7 || m.c === 0 || m.c === 7) s += 10;
      return s;
    };

    validMoves.sort((a,b) => scoreMove(b) - scoreMove(a));
    const bestMove = validMoves[0];

    applyMove(bestMove.r, bestMove.c, bestMove.flipped, 'W');
  }, [board, getValidMoves]);

  useEffect(() => {
    if (!duelMode && turn === 'W' && !winner) {
      const timer = setTimeout(makeAIMove, 1000);
      return () => clearTimeout(timer);
    }
  }, [turn, winner, makeAIMove, duelMode]);

  useEffect(() => {
    if (duelMode && opponentMove && opponentMove.type === 'move') {
      const { r, c, flipped, color } = opponentMove;
      applyMove(r, c, flipped, color);
    }
  }, [opponentMove]);

  return (
    <div className="max-w-md mx-auto">
      <div className="flex justify-between items-center mb-8">
        <div className="text-white">
          <h2 className="text-3xl font-black mb-1">Othello</h2>
          <p className="text-blue-200">
            {winner ? (
                winner === 'T' ? "Égalité !" : 
                duelMode ? (winner === (duelMode.role === 'player1' ? 'B' : 'W') ? "Victoire !" : "Défaite !") :
                (winner === 'B' ? "Victoire !" : "Défaite !")
            ) : (
                duelMode ? (
                    (duelMode.role === 'player1' ? turn === 'B' : turn === 'W') ? "À vous" : "Attente de l'adversaire..."
                ) : (
                    turn === 'B' ? "À vous" : "L'IA réfléchit..."
                )
            )}
          </p>
        </div>
        <Card className="px-4 py-2 bg-white/10 border-white/20 flex gap-4 text-white font-bold">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-zinc-800" /> {scores.B}
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-zinc-100" /> {scores.W}
          </div>
        </Card>
      </div>

      <Card className="p-2 bg-emerald-800 shadow-2xl border-4 border-emerald-900 aspect-square">
        <div className="grid grid-cols-8 grid-rows-8 h-full gap-1">
          {board.map((row, r) => row.map((cell, c) => {
            const myColor = duelMode ? (duelMode.role === 'player1' ? 'B' : 'W') : 'B';
            const isMyTurn = !duelMode || turn === myColor;
            const flipped = isMyTurn ? getFlippedPieces(board, r, c, myColor) : [];
            const isValid = flipped.length > 0;
            return (
              <div
                key={`${r}-${c}`}
                onClick={() => handleClick(r, c)}
                className={`flex items-center justify-center bg-emerald-700/50 rounded-sm relative cursor-pointer hover:bg-emerald-700
                    ${isValid ? 'after:content-[""] after:w-2 after:h-2 after:bg-white/20 after:rounded-full' : ''}`}
              >
                <AnimatePresence>
                  {cell && (
                    <motion.div
                      initial={{ scale: 0, rotateY: 180 }}
                      animate={{ scale: 1, rotateY: 0 }}
                      className={`w-4/5 h-4/5 rounded-full shadow-lg ${cell === 'B' ? 'bg-zinc-800' : 'bg-zinc-100'}`}
                    />
                  )}
                </AnimatePresence>
              </div>
            );
          }))}
        </div>
      </Card>
    </div>
  );
};

export default Othello;
