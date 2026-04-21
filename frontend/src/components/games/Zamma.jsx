import React, { useState, useEffect, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { motion, AnimatePresence } from 'framer-motion';

const SIZE = 9;

const Zamma = ({ onSubmit, duelMode, opponentMove, onMove, bothReady }) => {
  const [board, setBoard] = useState(initialBoard());
  const [turn, setTurn] = useState('B'); // B: Player, W: AI
  const [selected, setSelected] = useState(null);
  const [validMoves, setValidMoves] = useState([]);
  const [winner, setWinner] = useState(null);

  function initialBoard() {
    let b = Array(SIZE).fill(null).map(() => Array(SIZE).fill(null));
    for (let r = 0; r < 4; r++) for (let c = 0; c < SIZE; c++) b[r][c] = 'W';
    for (let r = 5; r < SIZE; r++) for (let c = 0; c < SIZE; c++) b[r][c] = 'B';
    // Middle row (4) is empty except (4,0), (4,2), (4,5), (4,7) which are intercalated
    b[4][0] = 'W'; b[4][2] = 'W'; b[4][5] = 'W'; b[4][7] = 'W';
    b[4][1] = 'B'; b[4][3] = 'B'; b[4][6] = 'B'; b[4][8] = 'B';
    // Middle is empty (4,4)
    return b;
  }

  const getMoves = useCallback((b, r, c) => {
    const color = b[r][c];
    if (!color) return [];
    const moves = [];
    const directions = [[0,1], [0,-1], [1,0], [-1,0], [1,1], [1,-1], [-1,1], [-1,-1]];
    const opponent = color === 'B' ? 'W' : 'B';

    directions.forEach(([dr, dc]) => {
      const nr = r + dr, nc = c + dc;
      if (nr >= 0 && nr < SIZE && nc >= 0 && nc < SIZE) {
        if (!b[nr][nc]) {
          moves.push({ r: nr, c: nc, capture: null });
        } else if (b[nr][nc] === opponent) {
          const fr = r + 2*dr, fc = c + 2*dc;
          if (fr >= 0 && fr < SIZE && fc >= 0 && fc < SIZE && !b[fr][fc]) {
            moves.push({ r: fr, c: fc, capture: { r: nr, c: nc } });
          }
        }
      }
    });
    return moves;
  }, []);

  const selectTile = (r, c) => {
    const myColor = duelMode ? (duelMode.role === 'player1' ? 'B' : 'W') : 'B';
    const isMyTurn = !duelMode || (bothReady && turn === myColor);
    if (winner || !isMyTurn || board[r][c] !== myColor) return;
    setSelected({ r, c });
    setValidMoves(getMoves(board, r, c));
  };

  const movePiece = (nr, nc) => {
    const move = validMoves.find(m => m.r === nr && m.c === nc);
    if (!move) return;

    if (duelMode) {
      let newBoard = board.map(row => [...row]);
      const color = newBoard[selected.r][selected.c];
      newBoard[nr][nc] = color;
      newBoard[selected.r][selected.c] = null;
      if (move.capture) newBoard[move.capture.r][move.capture.c] = null;
      onMove({ type: 'move', from: selected, to: { r: nr, c: nc }, move, boardState: newBoard, turnState: color === 'B' ? 'W' : 'B' });
    }

    applyMove(selected, { r: nr, c: nc }, move);
  };

  const applyMove = (from, to, move) => {
    let newBoard = board.map(row => [...row]);
    const color = newBoard[from.r][from.c];
    if (!color) return;

    newBoard[to.r][to.c] = color;
    newBoard[from.r][from.c] = null;

    if (move.capture) {
      newBoard[move.capture.r][move.capture.c] = null;
    }

    setBoard(newBoard);
    setSelected(null);
    setValidMoves([]);
    checkEnd(newBoard);
    setTurn(color === 'B' ? 'W' : 'B');
  };

  const checkEnd = (b) => {
    let counts = { B: 0, W: 0 };
    b.forEach(row => row.forEach(cell => { if(cell) counts[cell]++; }));
    if (counts.B === 0) setWinner('W');
    if (counts.W === 0) setWinner('B');
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
      if (cell === 'W') {
        const ms = getMoves(board, r, c);
        ms.forEach(m => allMoves.push({ from: { r, c }, ...m }));
      }
    }));

    if (allMoves.length === 0) { setWinner('B'); return; }

    const captureMoves = allMoves.filter(m => m.capture);
    applyMove(move.from, { r: move.r, c: move.c }, move);
  }, [board, getMoves]);

  useEffect(() => {
    if (!duelMode && turn === 'W' && !winner) {
      setTimeout(makeAIMove, 1000);
    }
  }, [turn, winner, makeAIMove, duelMode]);

  useEffect(() => {
    if (duelMode && opponentMove && opponentMove.type === 'move') {
      if (opponentMove.boardState) {
        setBoard(opponentMove.boardState);
        if (opponentMove.turnState) setTurn(opponentMove.turnState);
        checkEnd(opponentMove.boardState);
        return;
      }
      const { from, to, move } = opponentMove;
      applyMove(from, to, move);
    }
  }, [opponentMove]);

  return (
    <div className="max-w-xl mx-auto">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-black text-white mb-2">Zamma</h2>
        <p className="text-blue-200">
          {winner ? (
            duelMode ? (winner === (duelMode.role === 'player1' ? 'B' : 'W') ? "Victoire !" : "Défaite !") :
            (winner === 'B' ? "Victoire !" : "Défaite !")
          ) : (
            duelMode ? (
                (turn === (duelMode.role === 'player1' ? 'B' : 'W')) ? "À vous" : "Attente de l'adversaire..."
            ) : (
                turn === 'B' ? "À vous" : "L'IA joue..."
            )
          )}
        </p>
      </div>

      <Card className="p-4 bg-orange-950 shadow-2xl border-4 border-orange-900 aspect-square">
        <div className="grid grid-cols-9 grid-rows-9 h-full gap-1">
          {board.map((row, r) => row.map((cell, c) => {
            const isSelected = selected?.r === r && selected?.c === c;
            const isValid = validMoves.some(m => m.r === r && m.c === c);
            return (
              <div
                key={`${r}-${c}`}
                onClick={() => isValid ? movePiece(r, c) : selectTile(r, c)}
                className={`flex items-center justify-center rounded-sm transition-colors relative cursor-pointer
                  ${(r + c) % 2 === 0 ? 'bg-orange-900/40' : 'bg-orange-800/20'}
                  ${isValid ? 'after:content-[""] after:w-2 after:h-2 after:bg-blue-400 after:rounded-full after:opacity-50' : ''}`}
              >
                {cell && (
                  <motion.div
                    className={`w-4/5 h-4/5 rounded-full shadow-lg border-2 ${cell === 'B' ? 'bg-zinc-800 border-zinc-900' : 'bg-white border-zinc-200'}
                      ${isSelected ? 'ring-4 ring-blue-500' : ''}`}
                  />
                )}
              </div>
            );
          }))}
        </div>
      </Card>
      <p className="mt-4 text-center text-zinc-500 italic">Capturez les pièces adverses par-dessus.</p>
    </div>
  );
};

export default Zamma;
