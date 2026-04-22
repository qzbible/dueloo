import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Card } from '@/components/ui/card';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, Star, Shield, Zap, Sparkles, MoveRight } from 'lucide-react';

/**
 * LUDO MASTER - PRO EDITION
 * Concept: 15x15 Grid with high-fidelity styles and parabolic animations.
 * Features: Hopping piece animations, 3D CSS Dice, Expert Rules (Exact Win, Triple 6).
 */

const generatePath = () => {
  const p = [];
  for(let c=1; c<=5; c++) p.push({r: 6, c});
  for(let r=5; r>=0; r--) p.push({r, c: 6});
  p.push({r: 0, c: 7}); p.push({r: 0, c: 8});
  for(let r=1; r<=5; r++) p.push({r, c: 8});
  for(let c=9; c<=14; c++) p.push({r: 6, c});
  p.push({r: 7, c: 14}); p.push({r: 8, c: 14});
  for(let c=13; c>=9; c--) p.push({r: 8, c});
  for(let r=9; r<=14; r++) p.push({r, c: 8});
  p.push({r: 14, c: 7}); p.push({r: 14, c: 6});
  for(let r=13; r>=9; r--) p.push({r, c: 6});
  for(let c=5; c>=0; c--) p.push({r: 8, c});
  p.push({r: 7, c: 0}); p.push({r: 6, c: 0});
  return p;
};
const PATH_DATA = generatePath();

const HOMES = {
  R: Array(6).fill(0).map((_, i) => ({ r: 7, c: i + 1 })),
  G: Array(6).fill(0).map((_, i) => ({ r: i + 1, c: 7 })),
  Y: Array(6).fill(0).map((_, i) => ({ r: 7, c: 13 - i })),
  B: Array(6).fill(0).map((_, i) => ({ r: 13 - i, c: 7 })),
};

const START_OFFSETS = { R: 0, G: 13, Y: 26, B: 39 };
const SAFE_ZONES = [0, 8, 13, 21, 26, 34, 39, 47];

const getScreenCoords = (color, pos, id) => {
  if (pos === -1) {
    const bases = {
      R: [{r:2, c:2}, {r:2, c:3}, {r:3, c:2}, {r:3, c:3}],
      G: [{r:2, c:11}, {r:2, c:12}, {r:3, c:11}, {r:3, c:12}],
      Y: [{r:11, c:11}, {r:11, c:12}, {r:12, c:11}, {r:12, c:12}],
      B: [{r:11, c:2}, {r:11, c:3}, {r:12, c:2}, {r:12, c:3}],
    };
    return bases[color][id];
  }
  if (pos >= 52) {
    if (pos === 57) return {r: 7, c: 7}; // Victory overlaps slightly
    return HOMES[color][pos - 52];
  }
  const absPos = (START_OFFSETS[color] + pos) % 52;
  return PATH_DATA[absPos];
};

// --- DICE COMPONENT ---
const Dice3D = ({ value, rolling, onRoll, disabled }) => {
  return (
    <div className={`relative w-16 h-16 sm:w-20 sm:h-20 perspective-1000 ${disabled ? 'opacity-50 grayscale' : ''}`}>
      <motion.div 
        animate={rolling ? { 
          rotateX: [0, 360, 720, 1080], 
          rotateY: [0, 180, 540, 900],
          scale: [1, 1.2, 1]
        } : { rotateX: 0, rotateY: 0 }}
        transition={rolling ? { duration: 0.8, ease: "easeInOut" } : {}}
        onClick={!disabled && !rolling ? onRoll : undefined}
        className={`w-full h-full relative preserve-3d cursor-pointer active:scale-95 transition-transform`}
      >
        <div className="absolute inset-0 bg-white rounded-xl shadow-[0_8px_20px_rgba(0,0,0,0.4)] border-b-4 border-slate-300 flex items-center justify-center text-4xl sm:text-5xl font-black text-slate-800">
          {!rolling && value ? (['⚀', '⚁', '⚂', '⚃', '⚄', '⚅'][value - 1]) : <Zap className="w-8 h-8 text-yellow-500" />}
        </div>
      </motion.div>
    </div>
  );
};

// --- LUDO COMPONENT ---
const Ludo = ({ onSubmit, duelMode, opponentMove, onMove, bothReady, isSpectator = false }) => {
  const [gameState, setGameState] = useState(() => {
    const base = { pieces: { R: [-1, -1, -1, -1], Y: [-1, -1, -1, -1] }, turn: 'R', diceValue: null, diceRolled: false, winner: null, sixCount: 0 };
    return (duelMode?.recovered?.pieces || duelMode?.gameData?.pieces) ? (duelMode.recovered || duelMode.gameData) : base;
  });

  const { pieces, turn, diceValue, diceRolled, winner, sixCount } = gameState;
  const [movingPiece, setMovingPiece] = useState(null);
  const [rolling, setRolling] = useState(false);
  const myColor = duelMode ? (duelMode.role === 'player1' ? 'R' : 'Y') : 'R';
  const isMyTurn = !duelMode || (bothReady && turn === myColor);

  const getValidMoves = (color, dictPieces, rollVal) => {
    let valid = [];
    dictPieces[color].forEach((pos, id) => {
      if (pos === 57) return;
      if (pos === -1) {
        if (rollVal === 6) valid.push({ id, pos });
      } else {
        if (pos + rollVal <= 57) valid.push({ id, pos });
      }
    });
    return valid;
  };

  const handleRoll = () => {
    if (isSpectator || !isMyTurn || diceRolled || rolling || winner) return;
    setRolling(true);
    setTimeout(() => {
      const val = Math.floor(Math.random() * 6) + 1;
      let newSixCount = (val === 6) ? (sixCount + 1) : 0;
      let nextTurn = turn;
      let rolledStatus = true;

      // Rules Expert: Triple 6 cancel
      if (newSixCount === 3) {
        nextTurn = (turn === 'R' ? 'Y' : 'R');
        newSixCount = 0;
        rolledStatus = false;
      }

      const newState = { ...gameState, diceValue: val, diceRolled: rolledStatus, sixCount: newSixCount, turn: nextTurn };
      setGameState(newState);
      setRolling(false);
      if (duelMode) onMove({ type: 'ludo_state', ...newState });
    }, 600);
  };

  const executeMove = async (pieceId, isRemote = false, remoteData = null) => {
    if (movingPiece) return;
    
    const targetPieces = isRemote ? remoteData.pieces : pieces;
    const targetDice = isRemote ? remoteData.diceValue : diceValue;
    const targetTurn = isRemote ? (turn === 'R' ? 'Y' : 'R') : turn; // If remote, it was opponent's turn

    let startPos = pieces[turn][pieceId];
    let steps = startPos === -1 ? 1 : diceValue;

    // PARABOLIC HOPPING ANIMATION
    for (let i = 1; i <= steps; i++) {
        let currentPos = startPos === -1 ? 0 : startPos + i;
        setMovingPiece({ color: turn, id: pieceId, pos: currentPos });
        // Sound effect or haptic could go here
        await new Promise(r => setTimeout(r, 120));
    }
    setMovingPiece(null);

    // Logic after animation
    let endPos = startPos === -1 ? 0 : startPos + diceValue;
    let newPieces = JSON.parse(JSON.stringify(pieces));
    newPieces[turn][pieceId] = endPos;

    // Capture logic
    let didCapture = false;
    if (endPos >= 0 && endPos < 52) {
      const absPos = (START_OFFSETS[turn] + endPos) % 52;
      if (!SAFE_ZONES.includes(absPos)) {
        const oppColor = turn === 'R' ? 'Y' : 'R';
        newPieces[oppColor] = newPieces[oppColor].map(p => {
          if (p >= 0 && p < 52 && (START_OFFSETS[oppColor] + p) % 52 === absPos) {
            didCapture = true; 
            return -1;
          }
          return p;
        });
      }
    }

    const hasWon = newPieces[turn].every(p => p === 57);
    const newWinner = hasWon ? turn : winner;
    const rollAgain = (diceValue === 6 || didCapture) && !hasWon;
    const nextTurn = rollAgain ? turn : (turn === 'R' ? 'Y' : 'R');

    const newState = {
      pieces: newPieces,
      turn: nextTurn,
      diceValue: null,
      diceRolled: false,
      winner: newWinner,
      sixCount: rollAgain ? sixCount : 0
    };

    setGameState(newState);
    if (duelMode && !isRemote) {
        onMove({ type: 'ludo_move', pieceId, color: turn, newState });
    }
  };

  // Sync Remote Moves with Animation
  useEffect(() => {
    if (duelMode && opponentMove?.type === 'ludo_move') {
       if (!isMyTurn || isSpectator) {
         // Trigger the SAME animation sequence for local consistency
         // For Ludo with sequential steps, we must await or sync carefully
         // Simplification: directly apply state if movingPiece is busy, else animate
         if (!movingPiece) {
            const { pieceId, color, newState } = opponentMove;
            // Since executeMove uses current state, we need to be careful.
            // Let's just snap the state for now to avoid race conditions in this complex effect,
            // but the player's OWN moves are animated.
            setGameState(newState);
         }
       }
    } else if (duelMode && opponentMove?.type === 'ludo_state') {
       if (!isMyTurn || isSpectator) setGameState(opponentMove);
    }
  }, [opponentMove, duelMode, isMyTurn, isSpectator, movingPiece]);

  return (
    <div className={`flex flex-col select-none py-6 ${isSpectator ? 'w-full h-full' : 'max-w-2xl mx-auto items-center'}`}>
       
       {/* TURN INDICATOR PANEL */}
       <div className="w-full flex items-center justify-between px-6 py-4 bg-slate-900 shadow-2xl rounded-3xl border border-white/5 mb-8 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 via-purple-500/10 to-blue-500/10 animate-pulse" />
          <div className="relative z-10 flex flex-col">
             <div className="flex items-center gap-2 mb-1">
                <Trophy className="w-4 h-4 text-yellow-400" />
                <span className="text-[10px] font-black text-blue-400 uppercase tracking-[0.2em]">Ludo Pro Royale</span>
             </div>
             <div className="text-2xl font-black text-white italic">
                {winner ? (winner === myColor ? "VICTOIRE !" : "DÉFAITE") : (turn === myColor ? "À TOI DE JOUER" : "ATTENTE ADVERSAIRE...")}
             </div>
          </div>
          <div className="relative z-10">
             <Dice3D value={diceValue} rolling={rolling} onRoll={handleRoll} disabled={!isMyTurn || diceRolled || winner} />
          </div>
       </div>

       {/* PREMIUM BOARD */}
       <div className="relative aspect-square w-full max-w-[min(92vw,540px)] bg-[#926239] rounded-[2.5rem] p-4 shadow-[0_40px_80px_-20px_rgba(0,0,0,0.9)] border-[8px] border-[#5d3a1a]">
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/pinstriped-suit.png')] opacity-20 pointer-events-none" />
          
          <div className="relative w-full h-full grid grid-cols-15 grid-rows-15 bg-white rounded-2xl overflow-hidden shadow-inner">
             {/* Cross Pattern Board Design */}
             {Array(225).fill(0).map((_, i) => {
                const r = Math.floor(i / 15);
                const c = i % 15;
                const isR = r<6 && c<6; const isY = r>8 && c>8;
                const isG = r<6 && c>9; const isB = r>8 && c<6;
                const isSafe = PATH_DATA.some((p, idx) => p.r === r && p.c === c && SAFE_ZONES.includes(idx));
                const isRedPath = r === 7 && c >= 1 && c <= 6;
                const isYellowPath = r === 7 && c >= 8 && c <= 13;

                return (
                  <div key={i} className={`relative border-[0.5px] border-slate-100 
                    ${isR ? 'bg-red-600/95' : ''}
                    ${isY ? 'bg-yellow-500/95' : ''}
                    ${isG ? 'bg-emerald-600/95' : ''}
                    ${isB ? 'bg-blue-700/95' : ''}
                    ${isRedPath ? 'bg-red-50' : ''}
                    ${isYellowPath ? 'bg-yellow-50' : ''}
                    ${isSafe ? 'bg-slate-50 flex items-center justify-center' : ''}
                  `}>
                    {isSafe && <Star className="w-3 h-3 text-amber-500/40 fill-amber-500/10" />}
                    {isRedPath && c < 6 && <div className="absolute inset-1 rounded-full bg-red-500/10" />}
                  </div>
                );
             })}

             {/* ROYAL FINISH CENTER */}
             <div className="absolute top-[40%] left-[40%] w-[20%] h-[20%] z-10 border-2 border-amber-900/10 bg-white shadow-2xl">
                <div className="absolute inset-0 rotate-45 flex flex-wrap scale-150">
                   <div className="w-1/2 h-1/2 bg-red-600" /> <div className="w-1/2 h-1/2 bg-emerald-600" />
                   <div className="w-1/2 h-1/2 bg-blue-700" /> <div className="w-1/2 h-1/2 bg-yellow-500" />
                </div>
                <div className="relative z-20 w-full h-full flex items-center justify-center">
                    <div className="w-12 h-12 bg-white rounded-full shadow-2xl border-4 border-amber-900/5 flex items-center justify-center">
                        <Trophy className="w-6 h-6 text-amber-500" />
                    </div>
                </div>
             </div>

             {/* PIECES - LUXURY DESIGN */}
             {['R', 'Y'].map(color => 
               pieces[color].map((pos, id) => {
                 const isSelfMoving = movingPiece?.color === color && movingPiece?.id === id;
                 const activePos = isSelfMoving ? movingPiece.pos : pos;
                 const coords = getScreenCoords(color, activePos, id);
                 const canMove = diceRolled && isMyTurn && turn === color && getValidMoves(turn, pieces, diceValue).some(v => v.id === id);

                 return (
                   <motion.div
                     key={`${color}-${id}`}
                     style={{ top: `${(coords.r / 15) * 100}%`, left: `${(coords.c / 15) * 100}%` }}
                     initial={false}
                     animate={isSelfMoving ? { y: [0, -35, 0], scale: [1, 1.4, 1] } : { y: 0, scale: 1 }}
                     transition={isSelfMoving ? { duration: 0.12 } : { type: 'spring', stiffness: 200, damping: 20 }}
                     className="absolute w-[6.66%] h-[6.66%] z-30 p-[0.4rem]"
                   >
                     <button
                       onClick={() => canMove && executeMove(id)}
                       disabled={!canMove}
                       className={`w-full h-full rounded-full shadow-[0_8px_15px_rgba(0,0,0,0.6)] relative group overflow-hidden
                         ${color === 'R' ? 'bg-gradient-to-t from-red-900 via-red-600 to-red-400' : 'bg-gradient-to-t from-yellow-700 via-yellow-500 to-yellow-300'}
                         ${canMove ? 'cursor-pointer ring-4 ring-white animate-pulse' : 'cursor-default'}
                       `}
                     >
                       <div className="absolute top-1 left-1.5 w-1/2 h-1/3 bg-white/40 rounded-full blur-[1px]" />
                       <div className="absolute inset-1.5 rounded-full border border-black/10 flex items-center justify-center">
                          {pos === 57 && <Trophy className="w-1/2 h-1/2 text-white/50" />}
                       </div>
                     </button>
                   </motion.div>
                 );
               })
             )}
          </div>
       </div>

       {/* STATS DE JEU */}
       <div className="w-full max-w-md mt-12 grid grid-cols-2 gap-4">
          {['R', 'Y'].map(c => (
            <div key={c} className={`p-4 rounded-[2rem] border-2 transition-all ${turn === c ? 'bg-white/10 border-white/20' : 'bg-black/20 border-white/5 opacity-40'}`}>
                <div className="flex items-center justify-between mb-3">
                   <div className={`w-3 h-3 rounded-full ${c === 'R' ? 'bg-red-500 shadow-[0_0_10px_red]' : 'bg-yellow-400 shadow-[0_0_10px_yellow]'}`} />
                   <span className="text-[10px] font-black opacity-50 uppercase tracking-widest">{c === 'R' ? 'Empire Rouge' : 'Dynastie Jaune'}</span>
                </div>
                <div className="flex gap-2">
                   {pieces[c].map((p, i) => (
                      <div key={i} className={`flex-1 h-1.5 rounded-full ${p === 57 ? 'bg-emerald-400' : 'bg-white/10'}`}>
                         {p > -1 && p < 57 && <motion.div initial={{ width: 0 }} animate={{ width: `${(p/57)*100}%` }} className={`h-full rounded-full ${c === 'R' ? 'bg-red-500' : 'bg-yellow-400'}`} />}
                      </div>
                   ))}
                </div>
            </div>
          ))}
       </div>

       <style dangerouslySetInnerHTML={{ __html: `
         .perspective-1000 { perspective: 1000px; }
         .preserve-3d { transform-style: preserve-3d; }
       `}} />
    </div>
  );
};

export default Ludo;
