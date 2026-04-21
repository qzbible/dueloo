import React, { useState, useEffect, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { motion, AnimatePresence } from 'framer-motion';

const PIECES = {
  P: { type: 'pawn', value: 1, icon: '♟' },
  N: { type: 'knight', value: 3, icon: '♞' },
  B: { type: 'bishop', value: 3, icon: '♝' },
  R: { type: 'rook', value: 5, icon: '♜' },
  Q: { type: 'queen', value: 9, icon: '♛' },
  K: { type: 'king', value: 100, icon: '♚' }
};

const Chess = ({ onSubmit, duelMode, opponentMove, onMove, bothReady, isSpectator = false }) => {
  const [board, setBoard] = useState(initialBoard());
  const [turn, setTurn] = useState('w'); // 'w' for White (Player), 'b' for Black (AI)
  const [selected, setSelected] = useState(null);
  const [validMoves, setValidMoves] = useState([]);
  const [winner, setWinner] = useState(null);

  function initialBoard() {
    let b = Array(8).fill(null).map(() => Array(8).fill(null));
    const layout = ['R', 'N', 'B', 'Q', 'K', 'B', 'N', 'R'];
    
    for (let i = 0; i < 8; i++) {
      b[0][i] = { piece: layout[i], color: 'b' };
      b[1][i] = { piece: 'P', color: 'b' };
      b[6][i] = { piece: 'P', color: 'w' };
      b[7][i] = { piece: layout[i], color: 'w' };
    }
    return b;
  }

  const getMoves = useCallback((b, r, c) => {
    const p = b[r][c];
    if (!p) return [];
    const moves = [];
    const color = p.color;
    const enemy = color === 'w' ? 'b' : 'w';

    const addMove = (nr, nc) => {
        if (nr >= 0 && nr < 8 && nc >= 0 && nc < 8) {
            if (!b[nr][nc]) moves.push({ r: nr, c: nc });
            else if (b[nr][nc].color === enemy) moves.push({ r: nr, c: nc, capture: true });
            return !b[nr][nc]; // keep going if empty
        }
        return false;
    };

    switch (p.piece) {
      case 'P':
        const dir = color === 'w' ? -1 : 1;
        if (r+dir >= 0 && r+dir < 8 && !b[r+dir][c]) {
            moves.push({ r: r+dir, c: c });
            if ((color === 'w' && r === 6) || (color === 'b' && r === 1)) {
                if (!b[r+2*dir][c]) moves.push({ r: r+2*dir, c: c });
            }
        }
        [[dir, 1], [dir, -1]].forEach(([dr, dc]) => {
            if (r+dr >= 0 && r+dr < 8 && c+dc >= 0 && c+dc < 8 && b[r+dr][c+dc]?.color === enemy) {
                moves.push({ r: r+dr, c: c+dc, capture: true });
            }
        });
        break;
      case 'N':
        [[-2, -1], [-2, 1], [-1, -2], [-1, 2], [1, -2], [1, 2], [2, -1], [2, 1]].forEach(([dr, dc]) => addMove(r+dr, c+dc));
        break;
      case 'B':
        [[1, 1], [1, -1], [-1, 1], [-1, -1]].forEach(([dr, dc]) => {
            for (let i = 1; i < 8; i++) if (!addMove(r+i*dr, c+i*dc)) break;
        });
        break;
      case 'R':
        [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(([dr, dc]) => {
            for (let i = 1; i < 8; i++) if (!addMove(r+i*dr, c+i*dc)) break;
        });
        break;
      case 'Q':
        [[1, 1], [1, -1], [-1, 1], [-1, -1], [1, 0], [-1, 0], [0, 1], [0, -1]].forEach(([dr, dc]) => {
            for (let i = 1; i < 8; i++) if (!addMove(r+i*dr, c+i*dc)) break;
        });
        break;
      case 'K':
        [[1, 1], [1, -1], [-1, 1], [-1, -1], [1, 0], [-1, 0], [0, 1], [0, -1]].forEach(([dr, dc]) => addMove(r+dr, c+dc));
        break;
    }
    return moves;
  }, []);

  const selectTile = (r, c) => {
    const isMyTurn = !duelMode || (bothReady && (duelMode.role === 'player1' ? turn === 'w' : turn === 'b'));
    const myColor = duelMode ? (duelMode.role === 'player1' ? 'w' : 'b') : 'w';

    if (winner || !isMyTurn || isSpectator) return;
    if (board[r][c]?.color === myColor) {
      setSelected({ r, c });
      setValidMoves(getMoves(board, r, c));
    } else if (selected && validMoves.some(m => m.r === r && m.c === c)) {
      if (duelMode) {
        let newBoard = board.map(row => [...row]);
        const p = newBoard[selected.r][selected.c];
        newBoard[r][c] = p;
        newBoard[selected.r][selected.c] = null;
        if (p.piece === 'P' && (r === 0 || r === 7)) p.piece = 'Q';
        onMove({ type: 'move', fr: selected.r, fc: selected.c, tr: r, tc: c, boardState: newBoard, turnState: turn === 'w' ? 'b' : 'w' });
      }
      applyMove(selected.r, selected.c, r, c);
    }
  };

  const applyMove = (fr, fc, tr, tc) => {
    let newBoard = board.map(row => [...row]);
    const p = newBoard[fr][fc];
    if (!p) return;

    if (newBoard[tr][tc]?.piece === 'K') {
        setWinner(p.color);
    }

    newBoard[tr][tc] = p;
    newBoard[fr][fc] = null;

    // Promotion
    if (p.piece === 'P' && (tr === 0 || tr === 7)) p.piece = 'Q';

    setBoard(newBoard);
    setSelected(null);
    setValidMoves([]);
    setTurn(turn === 'w' ? 'b' : 'w');
  };

  useEffect(() => {
    if (winner) {
        const myColor = duelMode ? (duelMode.role === 'player1' ? 'w' : 'b') : 'w';
        setTimeout(() => onSubmit({ won: winner === myColor }), 2000);
    }
  }, [winner, onSubmit, duelMode]);

  const evaluate = (b) => {
    let score = 0;
    b.forEach(row => row.forEach(cell => {
      if (cell) {
        const val = PIECES[cell.piece].value;
        score += cell.color === 'b' ? val : -val;
      }
    }));
    return score;
  };

  const makeAIMove = useCallback(() => {
    let bestScore = -Infinity;
    let bestMove = null;

    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        if (board[r][c]?.color === 'b') {
          const moves = getMoves(board, r, c);
          moves.forEach(m => {
            const tempBoard = board.map(row => [...row]);
            tempBoard[m.r][m.c] = tempBoard[r][c];
            tempBoard[r][c] = null;
            const score = evaluate(tempBoard);
            if (score > bestScore) {
              bestScore = score;
              bestMove = { fr: r, fc: c, tr: m.r, tc: m.c };
            }
          });
        }
      }
    }

    if (bestMove) {
      applyMove(bestMove.fr, bestMove.fc, bestMove.tr, bestMove.tc);
    } else {
      setWinner('w');
    }
  }, [board, getMoves]);

  useEffect(() => {
    if (!duelMode && turn === 'b' && !winner) {
      const timer = setTimeout(makeAIMove, 800);
      return () => clearTimeout(timer);
    }
  }, [turn, winner, makeAIMove, duelMode]);

  useEffect(() => {
    if (duelMode && opponentMove && opponentMove.type === 'move') {
      if (opponentMove.boardState) {
        setBoard(opponentMove.boardState);
        if (opponentMove.turnState) setTurn(opponentMove.turnState);
        return;
      }
      const { fr, fc, tr, tc } = opponentMove;
      applyMove(fr, fc, tr, tc);
    }
  }, [opponentMove]);

  const myColor = duelMode ? (duelMode.role === 'player1' ? 'w' : 'b') : 'w';
  const isMyTurnNow = duelMode ? (bothReady && turn === myColor) : turn === 'w';
  const opponentColor = myColor === 'w' ? 'Noirs ♟' : 'Blancs ♙';
  const myColorLabel = myColor === 'w' ? 'Blancs ♙' : 'Noirs ♟';

  return (
    <div className={`${isSpectator ? 'w-full h-full' : 'max-w-xl mx-auto'} flex flex-col`}>
      {/* ─── Turn Status & Info ─────────────────────────── */}
      <div className="text-center mb-6">
        {/* Status badge */}
        <div className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-semibold transition-all duration-300 ${
          winner
            ? (winner === myColor ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' : 'bg-slate-500/20 text-slate-300 border border-slate-500/30')
            : isMyTurnNow
            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 animate-pulse'
            : 'bg-blue-500/10 text-blue-300 border border-blue-500/20'
        }`}>
          {winner ? (
            winner === myColor ? '🏆 Victoire — Roi adverse capturé !' : '💀 Défaite — Votre roi a été pris'
          ) : duelMode ? (
            !bothReady
              ? '⏳ Connexion de l\'adversaire…'
              : isMyTurnNow
              ? `♟ Votre tour (${myColorLabel})`
              : '⏳ Adversaire réfléchit…'
          ) : isSpectator ? (
            `♟ Vue Spectateur — ${turn === 'w' ? 'Blancs' : 'Noirs'} jouent`
          ) : (
            turn === 'w' ? '♟ Votre tour (Blancs)' : '🤖 L\'IA réfléchit (Noirs)…'
          )}
        </div>

        {/* Color legend in duel mode */}
        {duelMode && bothReady && !winner && (
          <div className="flex items-center justify-center gap-4 mt-2 text-xs text-white/50">
            <span>Vous : <span className="text-white font-semibold">{myColorLabel}</span></span>
            <span className="w-px h-3 bg-white/20" />
            <span>Adversaire : <span className="text-white font-semibold">{opponentColor}</span></span>
          </div>
        )}
      </div>

      <Card className={`p-1 sm:p-2 bg-stone-900 shadow-2xl border-2 sm:border-4 border-stone-800 aspect-square w-full max-w-[min(90vw,500px)] lg:max-w-none mx-auto`}>
        <div className="grid grid-cols-8 grid-rows-8 h-full">
          {board.map((row, r) => row.map((cell, c) => {
            const isSelected = selected?.r === r && selected?.c === c;
            const isValid = validMoves.some(m => m.r === r && m.c === c);
            const isCapture = isValid && board[r][c];
            
            return (
              <div
                key={`${r}-${c}`}
                onClick={() => selectTile(r, c)}
                className={`flex items-center justify-center text-4xl relative cursor-pointer
                  ${(r + c) % 2 === 0 ? 'bg-stone-300' : 'bg-stone-600'}
                  ${isSelected ? 'bg-yellow-400 opacity-90' : ''}
                  ${isValid ? 'after:content-[""] after:absolute after:w-3 after:h-3 after:bg-blue-500/50 after:rounded-full' : ''}
                  ${isCapture ? 'bg-red-500/40' : ''}`}
              >
                {cell && (
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className={cell.color === 'w' ? 'text-white drop-shadow-md' : 'text-black drop-shadow-sm'}
                  >
                    {PIECES[cell.piece].icon}
                  </motion.span>
                )}
              </div>
            );
          }))}
        </div>
      </Card>
    </div>
  );
};

export default Chess;
