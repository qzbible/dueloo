import React, { useState, useEffect, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';

const SIZE = 9;

const Go = ({ onSubmit }) => {
  const [board, setBoard] = useState(Array(SIZE).fill(null).map(() => Array(SIZE).fill(null)));
  const [turn, setTurn] = useState('B'); // B for Black (Player), W for White (AI)
  const [winner, setWinner] = useState(null);
  const [passed, setPassed] = useState({ B: false, W: false });

  const getLiberties = (b, r, c, color, visited = new Set()) => {
    const key = `${r}-${c}`;
    if (visited.has(key)) return new Set();
    visited.add(key);

    let liberties = new Set();
    const directions = [[0, 1], [0, -1], [1, 0], [-1, 0]];

    directions.forEach(([dr, dc]) => {
      const nr = r + dr, nc = c + dc;
      if (nr >= 0 && nr < SIZE && nc >= 0 && nc < SIZE) {
        if (!b[nr][nc]) liberties.add(`${nr}-${nc}`);
        else if (b[nr][nc] === color) {
          const groupLiberties = getLiberties(b, nr, nc, color, visited);
          groupLiberties.forEach(l => liberties.add(l));
        }
      }
    });
    return liberties;
  };

  const handleClick = (r, c) => {
    if (winner || turn !== 'B' || board[r][c]) return;
    
    let newBoard = board.map(row => [...row]);
    newBoard[r][c] = 'B';

    // Capture logic
    const opponent = 'W';
    let captured = false;
    [[0,1],[0,-1],[1,0],[-1,0]].forEach(([dr, dc]) => {
        const nr = r+dr, nc = c+dc;
        if (nr >= 0 && nr < SIZE && nc >= 0 && nc < SIZE && newBoard[nr][nc] === opponent) {
            if (getLiberties(newBoard, nr, nc, opponent).size === 0) {
                removeGroup(newBoard, nr, nc, opponent);
                captured = true;
            }
        }
    });

    // Suicide rule
    if (!captured && getLiberties(newBoard, r, c, 'B').size === 0) return;

    setBoard(newBoard);
    setTurn('W');
    setPassed({ ...passed, B: false });
  };

  const removeGroup = (b, r, c, color) => {
      const target = b[r][c];
      b[r][c] = null;
      [[0,1],[0,-1],[1,0],[-1,0]].forEach(([dr, dc]) => {
          const nr = r+dr, nc = c+dc;
          if (nr >= 0 && nr < SIZE && nc >= 0 && nc < SIZE && b[nr][nc] === target) {
              removeGroup(b, nr, nc, color);
          }
      });
  };

  const handlePass = () => {
    const newPassed = { ...passed, [turn]: true };
    setPassed(newPassed);
    if (newPassed.B && newPassed.W) calculateWinner();
    else setTurn(turn === 'B' ? 'W' : 'B');
  };

  const calculateWinner = () => {
      let bScore = 0, wScore = 0;
      board.forEach(row => row.forEach(cell => {
          if (cell === 'B') bScore++;
          if (cell === 'W') wScore++;
          // Simplified: also count territory (empty adjacent to only one color)
      }));
      wScore += 6.5; // Komi
      if (bScore > wScore) setWinner('B');
      else setWinner('W');
  };

  useEffect(() => {
    if (winner) {
      setTimeout(() => onSubmit({ won: winner === 'B' }), 2000);
    }
  }, [winner]);

  const makeAIMove = useCallback(() => {
    let bestMove = null;
    let maxLiberties = -1;

    for (let r = 0; r < SIZE; r++) {
      for (let c = 0; c < SIZE; c++) {
        if (!board[r][c]) {
            const liberties = getLiberties(board, r, c, 'W').size;
            if (liberties > maxLiberties) {
                maxLiberties = liberties;
                bestMove = { r, c };
            }
        }
      }
    }

    if (bestMove && maxLiberties > 0) {
      let newBoard = board.map(row => [...row]);
      newBoard[bestMove.r][bestMove.c] = 'W';
      setBoard(newBoard);
      setTurn('B');
      setPassed({ ...passed, W: false });
    } else {
        handlePass();
    }
  }, [board, passed]);

  useEffect(() => {
    if (turn === 'W' && !winner) {
      const timer = setTimeout(makeAIMove, 1000);
      return () => clearTimeout(timer);
    }
  }, [turn, winner, makeAIMove]);

  return (
    <div className="max-w-xl mx-auto">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-black text-white mb-2">Go (9x9)</h2>
        <p className="text-blue-200">
          {winner ? (winner === 'B' ? "Victoire !" : "Défaite !") : (turn === 'B' ? "À vous (Noir)" : "L'IA joue (Blanc)...")}
        </p>
      </div>

      <div className="bg-[#debb7d] p-6 rounded-lg shadow-2xl border-b-8 border-r-8 border-[#c4a469]">
        <div className="grid grid-cols-9 grid-rows-9 gap-0 bg-[#debb7d] relative overflow-hidden">
            {/* Grid lines */}
            <div className="absolute inset-0 pointer-events-none">
                {Array(9).fill(0).map((_, i) => (
                    <React.Fragment key={i}>
                        <div className="absolute bg-zinc-800/20" style={{ left: `${(i + 0.5) * 11.11}%`, top: '5.55%', bottom: '5.55%', width: '1px' }} />
                        <div className="absolute bg-zinc-800/20" style={{ top: `${(i + 0.5) * 11.11}%`, left: '5.55%', right: '5.55%', height: '1px' }} />
                    </React.Fragment>
                ))}
            </div>

            {board.map((row, r) => row.map((cell, c) => (
                <div
                    key={`${r}-${c}`}
                    onClick={() => handleClick(r, c)}
                    className="aspect-square flex items-center justify-center cursor-pointer relative z-10"
                >
                    {cell && (
                        <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            className={`w-4/5 h-4/5 rounded-full shadow-lg ${cell === 'B' ? 'bg-zinc-800' : 'bg-zinc-100'}`}
                        />
                    )}
                </div>
            )))}
        </div>
      </div>

      <div className="mt-8 flex justify-center gap-4">
        <Button onClick={handlePass} variant="outline" className="text-white border-white/20">
          Passer mon tour
        </Button>
      </div>
    </div>
  );
};

export default Go;
