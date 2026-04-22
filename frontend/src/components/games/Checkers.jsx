import React, { useState, useEffect, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { motion, AnimatePresence } from 'framer-motion';

const Checkers = ({ onSubmit, duelMode, opponentMove, onMove, bothReady, isSpectator = false, playerNames }) => {
  const [board, setBoard] = useState(initialBoard());
  const [turn, setTurn] = useState('B'); // B for Black (Player), W for White (AI)
  const [selected, setSelected] = useState(null);
  const [validMoves, setValidMoves] = useState([]);
  const [winner, setWinner] = useState(null);
  const [comboPiece, setComboPiece] = useState(null);

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

  const getMandatoryCaptures = useCallback((b, color) => {
    let captures = [];
    b.forEach((row, r) => row.forEach((cell, c) => {
      if (cell?.color === color && getMoves(b, r, c).some(m => m.capture)) {
        captures.push({ r, c });
      }
    }));
    return captures;
  }, [getMoves]);

  const myColor = duelMode ? (duelMode.role === 'player1' ? 'B' : 'W') : 'B';
  const isMyTurn = !duelMode || (bothReady && turn === myColor);
  const mandatoryPieces = isMyTurn ? getMandatoryCaptures(board, myColor) : [];

  const selectPiece = (r, c) => {
    if (winner || !isMyTurn || board[r][c]?.color !== myColor) return;
    
    // Prevent selecting another piece if a combo is active
    if (comboPiece && (r !== comboPiece.r || c !== comboPiece.c)) return;

    if (!comboPiece && mandatoryPieces.length > 0 && !mandatoryPieces.some(p => p.r === r && p.c === c)) {
      return; // "Prise obligatoire", cannot select standard pieces if captures exist
    }

    let moves = getMoves(board, r, c);
    if (mandatoryPieces.length > 0) {
      moves = moves.filter(m => m.capture);
    }

    setSelected({ r, c });
    setValidMoves(moves);
  };

  const handleSquareClick = (nr, nc) => {
    const isValid = validMoves.some(m => m.r === nr && m.c === nc);
    if (isValid) {
      const move = validMoves.find(m => m.r === nr && m.c === nc);
      executeMove(selected, { r: nr, c: nc }, move);
    } else {
      selectPiece(nr, nc);
    }
  };

  const executeMove = useCallback((from, to, move) => {
    let newBoard = board.map(row => [...row]);
    const piece = newBoard[from.r][from.c];
    if (!piece) return;

    newBoard[to.r][to.c] = piece;
    newBoard[from.r][from.c] = null;

    let isCombo = false;
    if (move.capture) {
      newBoard[move.capture.r][move.capture.c] = null;
      // Check for consecutive jumps
      const subsequentMoves = getMoves(newBoard, to.r, to.c);
      if (subsequentMoves.some(m => m.capture)) {
        isCombo = true;
      }
    }

    if (to.r === 0 && piece.color === 'B') piece.king = true;
    if (to.r === 7 && piece.color === 'W') piece.king = true;

    const nextTurn = isCombo ? piece.color : (piece.color === 'B' ? 'W' : 'B');

    setBoard(newBoard);
    checkEnd(newBoard);

    if (isCombo) {
      setSelected({ r: to.r, c: to.c });
      setValidMoves(getMoves(newBoard, to.r, to.c).filter(m => m.capture));
      setComboPiece({ r: to.r, c: to.c });
    } else {
      setSelected(null);
      setValidMoves([]);
      setComboPiece(null);
      setTurn(nextTurn);
    }

    if (duelMode && piece.color === myColor) {
      onMove({ 
        type: 'move', 
        from, 
        to, 
        move, 
        boardState: newBoard, 
        turnState: nextTurn,
        comboPiece: isCombo ? { r: to.r, c: to.c } : null
      });
    }
  }, [board, duelMode, myColor, onMove, getMoves]);

  const checkEnd = (b) => {
      const players = { B: 0, W: 0 };
      b.forEach(row => row.forEach(cell => { if(cell) players[cell.color]++; }));
      if(players.B === 0) setWinner('W');
      if(players.W === 0) setWinner('B');
  };

  useEffect(() => {
    if (winner) {
        setTimeout(() => onSubmit({ won: winner === myColor }), 2000);
    }
  }, [winner, onSubmit, myColor]);

  const makeAIMove = useCallback(() => {
    let allMoves = [];
    if (comboPiece) {
      const moves = getMoves(board, comboPiece.r, comboPiece.c, true).filter(m => m.capture);
      moves.forEach(m => allMoves.push({ from: comboPiece, to: { r: m.r, c: m.c }, ...m }));
    } else {
      board.forEach((row, r) => row.forEach((cell, c) => {
        if (cell?.color === 'W') {
          const moves = getMoves(board, r, c, true);
          moves.forEach(m => allMoves.push({ from: { r, c }, to: { r: m.r, c: m.c }, ...m }));
        }
      }));
    }

    if (allMoves.length === 0) { setWinner('B'); return; }

    const captures = allMoves.filter(m => m.capture);
    const move = (captures.length > 0 ? captures : allMoves)[Math.floor(Math.random() * (captures.length > 0 ? captures.length : allMoves.length))];

    executeMove(move.from, move.to, move);
  }, [board, getMoves, comboPiece, executeMove]);

  useEffect(() => {
    if (!duelMode && turn === 'W' && !winner) {
      const timer = setTimeout(makeAIMove, 1000);
      return () => clearTimeout(timer);
    }
  }, [turn, winner, makeAIMove, duelMode, comboPiece]);

  useEffect(() => {
    if (duelMode && opponentMove && opponentMove.type === 'move') {
      if (opponentMove.boardState) {
        setBoard(opponentMove.boardState);
        if (opponentMove.turnState) setTurn(opponentMove.turnState);
        checkEnd(opponentMove.boardState);
        
        if (opponentMove.comboPiece) {
           setSelected(opponentMove.comboPiece);
           setComboPiece(opponentMove.comboPiece);
           // Prevent the opponent (locally us) from jumping during this render cycle
        } else {
           setSelected(null);
           setComboPiece(null);
           setValidMoves([]);
        }
        return;
      }
    }
  }, [opponentMove]);

  // Captured pieces counts (starting with 12 each)
  let countB = 0; let countW = 0;
  board.forEach(row => row.forEach(cell => { if (cell?.color === 'B') countB++; if (cell?.color === 'W') countW++; }));
  const capturedB = 12 - countB;
  const capturedW = 12 - countW;

  const getBadgeClass = () => {
    if (winner) {
      if (isSpectator) return winner === 'W' ? 'bg-orange-500/20 text-orange-300 border border-orange-500/30' : 'bg-red-500/20 text-red-300 border border-red-500/30';
      return winner === myColor ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' : 'bg-slate-500/20 text-slate-300 border border-slate-500/30';
    }
    if (isSpectator) return turn === 'W' ? 'bg-orange-500/10 text-orange-300 border border-orange-500/20 shadow-[0_0_15px_rgba(249,115,22,0.15)]' : 'bg-red-500/10 text-red-300 border border-red-500/20 shadow-[0_0_15px_rgba(239,68,68,0.15)]';
    return isMyTurn ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 animate-pulse' : 'bg-blue-500/10 text-blue-300 border border-blue-500/20';
  };

  return (
    <div className={`${isSpectator ? 'w-full h-full' : 'max-w-xl mx-auto'} flex flex-col`}>
      <div className="text-center mb-6">
        <div className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-semibold transition-all duration-300 ${getBadgeClass()}`}>
          {winner ? (
            isSpectator 
              ? (winner === 'W' ? `🏆 Victoire de ${playerNames?.player1?.split(' ')[0] || 'Blancs'} !` : `🏆 Victoire de ${playerNames?.player2?.split(' ')[0] || 'Noirs'} !`)
              : (winner === myColor ? '🏆 Victoire Écrasante !' : '💀 Défaite !')
          ) : duelMode && !isSpectator ? (
            !bothReady
              ? '⏳ Connexion de l\'adversaire…'
              : isMyTurn
              ? (comboPiece ? `🔥 Enchaînez les prises !` : `⛃ Votre tour (${myColor === 'W' ? 'Blancs' : 'Noirs'})`)
              : '⏳ Adversaire réfléchit…'
          ) : isSpectator ? (
            turn === 'W' 
              ? <><span className="w-2 h-2 rounded-full bg-orange-400 animate-pulse shrink-0"/> Au tour de <span className="font-black text-orange-200 mx-0.5">{playerNames?.player1?.split(' ')[0] || 'Blancs'}</span> (Blancs)</>
              : <><span className="w-2 h-2 rounded-full bg-red-400 animate-pulse shrink-0"/> Au tour de <span className="font-black text-red-200 mx-0.5">{playerNames?.player2?.split(' ')[0] || 'Noirs'}</span> (Noirs)</>
          ) : (
            turn === 'W' ? '⛃ Votre tour (Blancs)' : '🤖 L\'IA réfléchit (Noirs)…'
          )}
        </div>
      </div>

      <div className="flex justify-between items-center w-full max-w-[min(90vw,500px)] lg:max-w-none mx-auto mb-3 px-1">
          <div className="flex flex-col gap-1 items-start">
             <div className="text-xs font-bold text-orange-300 uppercase shrink-0">Prises (Blancs)</div>
             <div className="flex flex-wrap max-w-[120px] gap-0.5 h-6">
                 {[...Array(capturedB)].map((_, i) => <div key={i} className="w-2.5 h-2.5 rounded-full bg-zinc-800 shadow-sm border border-zinc-600" />)}
             </div>
          </div>
          <div className="flex flex-col gap-1 items-end">
             <div className="text-xs font-bold text-red-300 uppercase shrink-0">Prises (Noirs)</div>
             <div className="flex flex-wrap max-w-[120px] justify-end gap-0.5 h-6">
                 {[...Array(capturedW)].map((_, i) => <div key={i} className="w-2.5 h-2.5 rounded-full bg-stone-300 shadow-sm border border-white" />)}
             </div>
          </div>
      </div>

      <Card className="p-1 sm:p-2 bg-[#5c3a21] shadow-2xl border-2 sm:border-4 border-[#3e2513] aspect-square w-full max-w-[min(90vw,500px)] lg:max-w-none mx-auto overflow-hidden">
        <div className="grid grid-cols-8 grid-rows-8 h-full rounded-sm overflow-hidden">
          {board.map((row, r) => row.map((cell, c) => {
            const isValid = validMoves.some(m => m.r === r && m.c === c);
            const isSelected = selected?.r === r && selected?.c === c;
            const isMandatory = turn === myColor && mandatoryPieces.some(p => p.r === r && p.c === c);
            
            return (
              <div
                key={`${r}-${c}`}
                onClick={() => handleSquareClick(r, c)}
                className={`flex items-center justify-center relative
                  ${(r + c) % 2 === 0 ? 'bg-[#f0d9b5]' : 'bg-[#b58863]'}
                  ${isValid ? 'after:content-[""] after:w-3 sm:after:w-4 after:h-3 sm:after:h-4 after:bg-green-500/80 after:rounded-full after:z-20 z-0' : 'z-0'}`}
              >
                {cell && (
                  <motion.div
                    layoutId={`chk-${r}-${c}`}
                    initial={{ opacity: 0, scale: 0.5 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className={`w-[85%] h-[85%] rounded-full shadow-[0_4px_10px_rgba(0,0,0,0.6),inset_0_-3px_5px_rgba(0,0,0,0.4)] flex items-center justify-center cursor-pointer relative z-10 transition-shadow duration-300
                      ${cell.color === 'B' ? 'bg-gradient-to-br from-zinc-700 to-zinc-950 border border-zinc-600' : 'bg-gradient-to-br from-stone-100 to-stone-400 border border-white/80'}
                      ${isSelected ? 'ring-4 ring-blue-400 shadow-[0_0_20px_rgba(59,130,246,0.8)]' : ''}
                      ${isMandatory && !isSelected ? 'ring-4 ring-red-500 animate-pulse shadow-[0_0_20px_rgba(239,68,68,0.8)]' : ''}`}
                  >
                    <div className={`w-[70%] h-[70%] rounded-full border flex items-center justify-center
                          ${cell.color === 'B' ? 'border-black/50 shadow-[inset_0_2px_4px_rgba(0,0,0,0.6)]' : 'border-stone-400/50 shadow-[inset_0_2px_4px_rgba(255,255,255,0.7)]'}`}>
                          {cell.king && <span className="text-yellow-400 drop-shadow-md text-xs sm:text-lg">👑</span>}
                    </div>
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
