import React, { useState, useEffect, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';

const TicTacToe = ({ onSubmit, duelMode, opponentMove, onMove, bothReady, isSpectator = false }) => {
  const [board, setBoard] = useState(Array(9).fill(null));
  const [isXNext, setIsXNext] = useState(true);
  const [winner, setWinner] = useState(null);

  const checkWinner = (squares) => {
    const lines = [
      [0, 1, 2], [3, 4, 5], [6, 7, 8], // rows
      [0, 3, 6], [1, 4, 7], [2, 5, 8], // cols
      [0, 4, 8], [2, 4, 6]             // diags
    ];
    for (let i = 0; i < lines.length; i++) {
      const [a, b, c] = lines[i];
      if (squares[a] && squares[a] === squares[b] && squares[a] === squares[c]) {
        return squares[a];
      }
    }
    if (squares.every(s => s !== null)) return 'T'; // Tie
    return null;
  };

  const minimax = (squares, depth, isMaximizing) => {
    const res = checkWinner(squares);
    if (res === 'O') return 10 - depth;
    if (res === 'X') return depth - 10;
    if (res === 'T') return 0;

    if (isMaximizing) {
      let bestScore = -Infinity;
      for (let i = 0; i < 9; i++) {
        if (!squares[i]) {
          squares[i] = 'O';
          let score = minimax(squares, depth + 1, false);
          squares[i] = null;
          bestScore = Math.max(score, bestScore);
        }
      }
      return bestScore;
    } else {
      let bestScore = Infinity;
      for (let i = 0; i < 9; i++) {
        if (!squares[i]) {
          squares[i] = 'X';
          let score = minimax(squares, depth + 1, true);
          squares[i] = null;
          bestScore = Math.min(score, bestScore);
        }
      }
      return bestScore;
    }
  };

  const makeAIMove = useCallback((currentBoard) => {
    let bestScore = -Infinity;
    let move = -1;
    for (let i = 0; i < 9; i++) {
      if (!currentBoard[i]) {
        currentBoard[i] = 'O';
        let score = minimax(currentBoard, 0, false);
        currentBoard[i] = null;
        if (score > bestScore) {
          bestScore = score;
          move = i;
        }
      }
    }
    if (move !== -1) {
      const newBoard = [...currentBoard];
      newBoard[move] = 'O';
      setBoard(newBoard);
      const win = checkWinner(newBoard);
      if (win) handleEnd(win);
      else setIsXNext(true);
    }
  }, []);

  useEffect(() => {
    if (!duelMode && !isXNext && !winner) {
      const timer = setTimeout(() => makeAIMove(board), 600);
      return () => clearTimeout(timer);
    }
  }, [isXNext, winner, board, makeAIMove, duelMode]);

  useEffect(() => {
    if (duelMode && opponentMove && opponentMove.type === 'move') {
      const { index } = opponentMove;
      if (board[index] === null) {
        const newBoard = [...board];
        newBoard[index] = duelMode.role === 'player1' ? 'O' : 'X';
        setBoard(newBoard);
        const win = checkWinner(newBoard);
        if (win) handleEnd(win);
        else setIsXNext(duelMode.role === 'player1');
      }
    }
  }, [opponentMove]);

  const handleClick = (i) => {
    const isMyTurn = !duelMode || (bothReady && (duelMode.role === 'player1' ? isXNext : !isXNext));
    const mySymbol = duelMode ? (duelMode.role === 'player1' ? 'X' : 'O') : 'X';

    if (winner || board[i] || !isMyTurn || isSpectator) return;
    
    const newBoard = [...board];
    newBoard[i] = mySymbol;
    setBoard(newBoard);

    if (duelMode) {
      onMove({ type: 'move', index: i });
    }

    const win = checkWinner(newBoard);
    if (win) handleEnd(win);
    else setIsXNext(mySymbol === 'O');
  };

  const handleEnd = (win) => {
    setWinner(win);
    setTimeout(() => {
      onSubmit({ won: win === 'X' });
    }, 1500);
  };

  return (
    <div className="max-w-md mx-auto">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-black text-white mb-2">Morpion</h2>
        <p className="text-blue-200">
          {winner ? (
            winner === 'T' ? "Égalité !" : 
            duelMode ? (winner === (duelMode.role === 'player1' ? 'X' : 'O') ? "Victoire !" : "Défaite !") :
            (winner === 'X' ? "Vous avez gagné !" : "L'IA a gagné !")
          ) : (
            duelMode ? (
                !bothReady ? "Attente de la connexion de l'adversaire..." :
                ((duelMode.role === 'player1' ? isXNext : !isXNext) ? "À vous de jouer !" : "Attente de l'adversaire...")
            ) : isSpectator ? (
                `Vue Spectateur — ${isXNext ? 'X' : 'O'} joue`
            ) : (
                isXNext ? "À vous de jouer (X)" : "L'IA réfléchit (O)..."
            )
          )}
        </p>
      </div>

      <Card className="p-4 bg-white/5 backdrop-blur-md border-white/20 aspect-square">
        <div className="grid grid-cols-3 gap-4 h-full">
          {board.map((val, i) => (
            <motion.div
              key={i}
              whileHover={!val && (!duelMode || (duelMode.role === 'player1' ? isXNext : !isXNext)) ? { scale: 1.05 } : {}}
              whileTap={!val && (!duelMode || (duelMode.role === 'player1' ? isXNext : !isXNext)) ? { scale: 0.95 } : {}}
              onClick={() => handleClick(i)}
              className={`flex items-center justify-center text-5xl font-black rounded-2xl cursor-pointer transition-colors
                ${!val && (!duelMode || (duelMode.role === 'player1' ? isXNext : !isXNext)) ? 'bg-white/10 hover:bg-white/20' : 'bg-white/5'}
                ${val === 'X' ? 'text-blue-400' : 'text-red-400'}`}
            >
              <AnimatePresence mode="wait">
                {val && (
                  <motion.span
                    initial={{ scale: 0, rotate: -45 }}
                    animate={{ scale: 1, rotate: 0 }}
                    key={val}
                  >
                    {val === 'X' ? '✕' : '◯'}
                  </motion.span>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </div>
      </Card>
      
      <div className="mt-8 flex justify-center">
        <Button 
          variant="outline" 
          onClick={() => { setBoard(Array(9).fill(null)); setIsXNext(true); setWinner(null); }}
          className="border-white/20 text-white hover:bg-white/10"
        >
          Réinitialiser
        </Button>
      </div>
    </div>
  );
};

export default TicTacToe;
