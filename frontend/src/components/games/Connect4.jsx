import React, { useState, useEffect, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { motion, AnimatePresence } from 'framer-motion';

const ROWS = 6;
const COLS = 7;

const Connect4 = ({ onSubmit, duelMode, opponentMove, onMove, bothReady }) => {
  const [board, setBoard] = useState(Array(ROWS).fill(null).map(() => Array(COLS).fill(null)));
  const [isRedNext, setIsRedNext] = useState(true);
  const [winner, setWinner] = useState(null);

  const checkWinner = (b) => {
    // Horizontal
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS - 3; c++) {
        if (b[r][c] && b[r][c] === b[r][c+1] && b[r][c] === b[r][c+2] && b[r][c] === b[r][c+3]) return b[r][c];
      }
    }
    // Vertical
    for (let r = 0; r < ROWS - 3; r++) {
      for (let c = 0; c < COLS; c++) {
        if (b[r][c] && b[r][c] === b[r+1][c] && b[r][c] === b[r+2][c] && b[r][c] === b[r+3][c]) return b[r][c];
      }
    }
    // Diagonal \
    for (let r = 0; r < ROWS - 3; r++) {
      for (let c = 0; c < COLS - 3; c++) {
        if (b[r][c] && b[r][c] === b[r+1][c+1] && b[r][c] === b[r+2][c+2] && b[r][c] === b[r+3][c+3]) return b[r][c];
      }
    }
    // Diagonal /
    for (let r = 3; r < ROWS; r++) {
      for (let c = 0; c < COLS - 3; c++) {
        if (b[r][c] && b[r][c] === b[r-1][c+1] && b[r][c] === b[r-2][c+2] && b[r][c] === b[r-3][c+3]) return b[r][c];
      }
    }
    if (b.every(row => row.every(cell => cell !== null))) return 'T';
    return null;
  };

  const evaluate = (b) => {
      // Very simple heuristic: count windows of 3
      // For brevity, we'll just return random-ish if no win
      return 0;
  };

  const minimax = (b, depth, alpha, beta, isMaximizing) => {
    const res = checkWinner(b);
    if (res === 'Y') return 1000 - depth; // Yellow (AI)
    if (res === 'R') return depth - 1000; // Red (Player)
    if (res === 'T') return 0;
    if (depth >= 4) return evaluate(b);

    if (isMaximizing) {
      let maxEval = -Infinity;
      for (let c = 0; c < COLS; c++) {
        const r = getFreeRow(b, c);
        if (r !== -1) {
          b[r][c] = 'Y';
          let ev = minimax(b, depth + 1, alpha, beta, false);
          b[r][c] = null;
          maxEval = Math.max(maxEval, ev);
          alpha = Math.max(alpha, ev);
          if (beta <= alpha) break;
        }
      }
      return maxEval;
    } else {
      let minEval = Infinity;
      for (let c = 0; c < COLS; c++) {
        const r = getFreeRow(b, c);
        if (r !== -1) {
          b[r][c] = 'R';
          let ev = minimax(b, depth + 1, alpha, beta, true);
          b[r][c] = null;
          minEval = Math.min(minEval, ev);
          beta = Math.min(beta, ev);
          if (beta <= alpha) break;
        }
      }
      return minEval;
    }
  };

  const getFreeRow = (b, c) => {
    for (let r = ROWS - 1; r >= 0; r--) {
      if (!b[r][c]) return r;
    }
    return -1;
  };

  const makeAIMove = useCallback(() => {
    let bestScore = -Infinity;
    let move = -1;
    let bCopy = board.map(r => [...r]);
    
    // Check if AI can win in one move
    for(let c=0; c<COLS; c++){
        let r = getFreeRow(bCopy, c);
        if(r !== -1){
            bCopy[r][c] = 'Y';
            if(checkWinner(bCopy) === 'Y') { move = c; break; }
            bCopy[r][c] = null;
        }
    }
    
    if(move === -1){
        // Check if AI needs to block
        for(let c=0; c<COLS; c++){
            let r = getFreeRow(bCopy, c);
            if(r !== -1){
                bCopy[r][c] = 'R';
                if(checkWinner(bCopy) === 'R') { move = c; break; }
                bCopy[r][c] = null;
            }
        }
    }

    if(move === -1){
        for (let c = 0; c < COLS; c++) {
          const r = getFreeRow(bCopy, c);
          if (r !== -1) {
            bCopy[r][c] = 'Y';
            let score = minimax(bCopy, 0, -Infinity, Infinity, false);
            bCopy[r][c] = null;
            if (score > bestScore) {
              bestScore = score;
              move = c;
            }
          }
        }
    }

    if (move !== -1) {
      dropDisc(move, 'Y');
    }
  }, [board]);

  useEffect(() => {
    if (!duelMode && !isRedNext && !winner) {
      const timer = setTimeout(makeAIMove, 800);
      return () => clearTimeout(timer);
    }
  }, [isRedNext, winner, makeAIMove, duelMode]);

  useEffect(() => {
    if (duelMode && opponentMove && opponentMove.type === 'drop') {
      const { col } = opponentMove;
      const opponentColor = duelMode.role === 'player1' ? 'Y' : 'R';
      dropDisc(col, opponentColor);
    }
  }, [opponentMove]);

  const dropDisc = (c, color) => {
    const r = getFreeRow(board, c);
    if (r === -1) return;
    const newBoard = board.map(row => [...row]);
    newBoard[r][c] = color;
    setBoard(newBoard);
    const win = checkWinner(newBoard);
    if (win) {
      setWinner(win);
      setTimeout(() => onSubmit({ won: win === 'R' }), 2000);
    } else {
      setIsRedNext(color === 'Y');
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-black text-white mb-2">Puissance 4</h2>
        <p className="text-blue-200">
          {winner ? (
            winner === 'T' ? "Égalité !" : 
            duelMode ? (winner === (duelMode.role === 'player1' ? 'R' : 'Y') ? "Victoire !" : "Défaite !") :
            (winner === 'R' ? "Rouge gagne !" : "Jaune gagne !")
          ) : (
            duelMode ? (
                !bothReady ? "Attente de la connexion de l'adversaire..." :
                ((duelMode.role === 'player1' ? isRedNext : !isRedNext) ? "À vous (Rouge) !" : "Attente de l'adversaire...")
            ) : (
                isRedNext ? "À vous (Rouge)" : "IA réfléchit (Jaune)..."
            )
          )}
        </p>
      </div>

      <div className="relative pb-1 bg-blue-800 rounded-3xl p-4 shadow-2xl border-4 border-blue-600">
        <div className="grid grid-cols-7 gap-3">
          {Array(COLS).fill(0).map((_, c) => (
            <div 
              key={c} 
              className="group cursor-pointer"
              onClick={() => {
                const isMyTurn = !duelMode || (bothReady && (duelMode.role === 'player1' ? isRedNext : !isRedNext));
                if (isMyTurn && !winner) {
                    const myColor = duelMode ? (duelMode.role === 'player1' ? 'R' : 'Y') : 'R';
                    if (getFreeRow(board, c) !== -1) {
                        if (duelMode) onMove({ type: 'drop', col: c });
                        dropDisc(c, myColor);
                    }
                }
              }}
            >
              {Array(ROWS).fill(0).map((_, r) => (
                <div key={r} className="w-12 h-12 sm:w-16 sm:h-16 bg-blue-900 rounded-full mb-3 flex items-center justify-center overflow-hidden">
                  <AnimatePresence>
                    {board[r][c] && (
                      <motion.div
                        initial={{ y: -300 }}
                        animate={{ y: 0 }}
                        transition={{ type: 'spring', damping: 15 }}
                        className={`w-10 h-10 sm:w-14 sm:h-14 rounded-full shadow-inner ${board[r][c] === 'R' ? 'bg-red-500' : 'bg-yellow-400'}`}
                      />
                    )}
                  </AnimatePresence>
                </div>
              ))}
              <div className="h-2 w-full bg-blue-600 rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Connect4;
