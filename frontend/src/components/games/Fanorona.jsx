import React, { useState, useEffect, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { motion, AnimatePresence } from 'framer-motion';

const ROWS = 5;
const COLS = 9;

const Fanorona = ({ onSubmit, duelMode, opponentMove, onMove, bothReady }) => {
  const [board, setBoard] = useState(initialBoard());
  const [turn, setTurn] = useState('B'); // B: Player, W: AI
  const [selected, setSelected] = useState(null);
  const [validMoves, setValidMoves] = useState([]);
  const [winner, setWinner] = useState(null);

  function initialBoard() {
    let b = Array(ROWS).fill(null).map(() => Array(COLS).fill(null));
    // Standard setup: top half White, bottom half Black, middle row interleaved
    for (let r = 0; r < 2; r++) for (let c = 0; c < COLS; c++) b[r][c] = 'W';
    for (let r = 3; r < 5; r++) for (let c = 0; c < COLS; c++) b[r][c] = 'B';
    b[2][0] = 'W'; b[2][2] = 'W'; b[2][5] = 'W'; b[2][7] = 'W';
    b[2][1] = 'B'; b[2][3] = 'B'; b[2][6] = 'B'; b[2][8] = 'B';
    // Center is empty (2,4)
    return b;
  }

  const getNeighbors = (r, c) => {
    let neighbors = [];
    const directions = [[0,1], [0,-1], [1,0], [-1,0], [1,1], [1,-1], [-1,1], [-1,-1]];
    const isStrong = (r + c) % 2 === 0; // Intersection with diagonal lines
    
    directions.forEach(([dr, dc]) => {
      if (!isStrong && (dr !== 0 && dc !== 0)) return; // Weak intersections only orthogonal
      const nr = r + dr, nc = c + dc;
      if (nr >= 0 && nr < ROWS && nc >= 0 && nc < COLS) {
        neighbors.push({ r: nr, c: nc, dr, dc });
      }
    });
    return neighbors;
  };

  const findCaptures = (b, r, c, nr, nc, dr, dc, color) => {
    let approach = [];
    let withdrawal = [];
    const opponent = color === 'B' ? 'W' : 'B';

    // Approach: check pieces in front of target
    let ar = nr + dr, ac = nc + dc;
    while (ar >= 0 && ar < ROWS && ac >= 0 && ac < COLS && b[ar][ac] === opponent) {
      approach.push({ r: ar, c: ac });
      ar += dr; ac += dc;
    }

    // Withdrawal: check pieces behind starting point
    let wr = r - dr, wc = c - dc;
    while (wr >= 0 && wr < ROWS && wc >= 0 && wc < COLS && b[wr][wc] === opponent) {
      withdrawal.push({ r: wr, c: wc });
      wr -= dr; wc -= dc;
    }

    return { approach, withdrawal };
  };

  const getValidMovesForPiece = useCallback((b, r, c) => {
    const color = b[r][c];
    if (!color) return [];
    const moves = [];
    
    getNeighbors(r, c).forEach(({ r: nr, c: nc, dr, dc }) => {
      if (!b[nr][nc]) {
        const caps = findCaptures(b, r, c, nr, nc, dr, dc, color);
        moves.push({ r: nr, c: nc, dr, dc, caps });
      }
    });
    return moves;
  }, []);

  const selectPiece = (r, c) => {
    const myColor = duelMode ? (duelMode.role === 'player1' ? 'B' : 'W') : 'B';
    const isMyTurn = !duelMode || (bothReady && turn === myColor);
    if (winner || !isMyTurn || board[r][c] !== myColor) return;
    setSelected({ r, c });
    setValidMoves(getValidMovesForPiece(board, r, c));
  };

  const movePiece = (nr, nc, capType = null) => {
    const move = validMoves.find(m => m.r === nr && m.c === nc);
    if (!move) return;

    if (duelMode) {
      let newBoard = board.map(row => [...row]);
      const color = newBoard[selected.r][selected.c];
      newBoard[nr][nc] = color;
      newBoard[selected.r][selected.c] = null;

      const { approach, withdrawal } = move.caps;
      let actualCaptures = [];
      if (capType === 'approach') actualCaptures = approach;
      else if (capType === 'withdrawal') actualCaptures = withdrawal;
      else actualCaptures = [...approach, ...withdrawal];

      actualCaptures.forEach(p => newBoard[p.r][p.c] = null);
      onMove({ type: 'move', from: selected, to: { r: nr, c: nc }, move, capType, boardState: newBoard, turnState: color === 'B' ? 'W' : 'B' });
    }

    applyMove(selected, { r: nr, c: nc }, move, capType);
  };

  const applyMove = (from, to, move, capType = null) => {
    let newBoard = board.map(row => [...row]);
    const color = newBoard[from.r][from.c];
    if (!color) return;

    newBoard[to.r][to.c] = color;
    newBoard[from.r][from.c] = null;

    const { approach, withdrawal } = move.caps;
    let actualCaptures = [];
    if (capType === 'approach') actualCaptures = approach;
    else if (capType === 'withdrawal') actualCaptures = withdrawal;
    else actualCaptures = [...approach, ...withdrawal];

    actualCaptures.forEach(p => newBoard[p.r][p.c] = null);

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
        const ms = getValidMovesForPiece(board, r, c);
        ms.forEach(m => allMoves.push({ from: { r, c }, ...m }));
      }
    }));

    if (allMoves.length === 0) { setWinner('B'); return; }

    // Auto-capture both types for AI for simplicity
    applyMove(move.from, { r: move.r, c: move.c }, move);
  }, [board, getValidMovesForPiece]);

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
      const { from, to, move, capType } = opponentMove;
      applyMove(from, to, move, capType);
    }
  }, [opponentMove]);

  return (
    <div className="max-w-4xl mx-auto">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-black text-white mb-2">Fanorona</h2>
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

      <Card className="p-8 bg-stone-100 shadow-2xl relative">
        {/* Draw lines */}
        <div className="absolute inset-0 pointer-events-none p-8">
            <svg className="w-full h-full stroke-stone-400 stroke-2">
                {/* Horizontal */}
                {Array(ROWS).fill(0).map((_, i) => <line key={`h${i}`} x1="0" y1={`${i * 25}%`} x2="100%" y2={`${i * 25}%`} />)}
                {/* Vertical */}
                {Array(COLS).fill(0).map((_, i) => <line key={`v${i}`} x1={`${i * 12.5}%`} y1="0" x2={`${i * 12.5}%`} y2="100%" />)}
                {/* Diagonals (simplified) */}
                <line x1="0" y1="0" x2="100%" y2="100%" />
                <line x1="0" y1="50%" x2="50%" y2="100%" />
                <line x1="100%" y1="0" x2="0" y2="100%" />
            </svg>
        </div>

        <div className="grid grid-cols-9 grid-rows-5 h-[300px] gap-0 relative z-10">
          {board.map((row, r) => row.map((cell, c) => {
            const isSelected = selected?.r === r && selected?.c === c;
            const move = validMoves.find(m => m.r === r && m.c === c);
            const isValid = !!move;
            return (
              <div
                key={`${r}-${c}`}
                onClick={() => isValid ? movePiece(r, c) : selectPiece(r, c)}
                className="flex items-center justify-center relative cursor-pointer"
              >
                {cell && (
                  <motion.div
                    className={`w-8 h-8 rounded-full shadow-lg border-2 ${cell === 'B' ? 'bg-zinc-800 border-zinc-900' : 'bg-white border-zinc-200'}
                      ${isSelected ? 'ring-4 ring-blue-500' : ''}`}
                  />
                )}
                {isValid && <div className="w-3 h-3 bg-blue-400 rounded-full opacity-50" />}
              </div>
            );
          }))}
        </div>
      </Card>
      <p className="mt-4 text-center text-zinc-500 italic">Capturez par approche ou éloignement.</p>
    </div>
  );
};

export default Fanorona;
