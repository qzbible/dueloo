import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, Star, Home, ArrowRight, ArrowLeft, ArrowUp, ArrowDown, Crown, Zap } from 'lucide-react';

/**
 * LUDO ROYAL EDITION - REFERENCE MATCH
 * Layout: 15x15 Grid
 * Visual Style: High-gloss, rounded corners, specific safe zones.
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

// Exact Safe Zones from image
// Image shows stars at specific cells. Standard Ludo has 8 safe cells on path.
const SAFE_ZONES = [0, 8, 13, 21, 26, 34, 39, 47];

const COLORS = {
  R: { main: '#D32F2F', light: '#FF5252', bg: 'bg-red-500' },
  G: { main: '#388E3C', light: '#4CAF50', bg: 'bg-green-600' },
  B: { main: '#1976D2', light: '#2196F3', bg: 'bg-blue-600' },
  Y: { main: '#FBC02D', light: '#FFEB3B', bg: 'bg-yellow-500' },
};

const getScreenCoords = (color, pos, id) => {
  if (pos === -1) {
    const bases = {
      R: [{r:1.5, c:1.5}, {r:1.5, c:3.5}, {r:3.5, c:1.5}, {r:3.5, c:3.5}],
      G: [{r:1.5, c:10.5}, {r:1.5, c:12.5}, {r:3.5, c:10.5}, {r:3.5, c:12.5}],
      Y: [{r:10.5, c:10.5}, {r:10.5, c:12.5}, {r:12.5, c:10.5}, {r:12.5, c:12.5}],
      B: [{r:10.5, c:1.5}, {r:10.5, c:3.5}, {r:12.5, c:1.5}, {r:12.5, c:3.5}],
    };
    return bases[color][id];
  }
  if (pos >= 52) {
    if (pos === 57) return {r: 7, c: 7};
    return HOMES[color][pos - 52];
  }
  const absPos = (START_OFFSETS[color] + pos) % 52;
  return PATH_DATA[absPos];
};

// --- LUX PIECE ---
const Piece = ({ color, isActive, onClick, pPos }) => (
  <button
    disabled={!isActive}
    onClick={onClick}
    className={`w-full h-full relative group transition-transform ${isActive ? 'cursor-pointer animate-bounce' : 'cursor-default'}`}
  >
    {/* Piece Base */}
    <div className={`absolute bottom-0 left-1/2 -translate-x-1/2 w-4/5 h-1/4 rounded-full shadow-[0_4px_10px_rgba(0,0,0,0.5)] 
      ${color === 'R' ? 'bg-[#980000]' : color === 'Y' ? 'bg-[#b8860b]' : color === 'G' ? 'bg-[#1b5e20]' : 'bg-[#0d47a1]'}`} 
    />
    {/* Piece Body */}
    <div className={`absolute inset-x-1.5 bottom-1 top-1 rounded-t-full shadow-lg border-b-4 border-black/20
      ${color === 'R' ? 'bg-gradient-to-t from-red-800 via-red-600 to-red-400' : 
        color === 'Y' ? 'bg-gradient-to-t from-yellow-700 via-yellow-500 to-yellow-300' :
        color === 'G' ? 'bg-gradient-to-t from-green-800 via-green-600 to-green-400' :
        'bg-gradient-to-t from-blue-800 via-blue-600 to-blue-400'}
    `}>
      {/* Glossy Top */}
      <div className="absolute top-1 left-2 w-1/2 h-1/3 bg-white/40 rounded-full blur-[1px]" />
      {pPos === 57 && <Crown className="absolute inset-0 m-auto w-1/2 h-1/2 text-white/50" />}
    </div>
  </button>
);

const Ludo = ({ onSubmit, duelMode, opponentMove, onMove, bothReady, isSpectator = false }) => {
  const [gameState, setGameState] = useState(() => {
    const base = { pieces: { R: [-1, -1, -1, -1], Y: [-1, -1, -1, -1], G: [-1, -1, -1, -1], B: [-1, -1, -1, -1] }, turn: 'R', diceValue: null, diceRolled: false, winner: null };
    return (duelMode?.recovered?.pieces || duelMode?.gameData?.pieces) ? (duelMode.recovered || duelMode.gameData) : base;
  });

  const { pieces, turn, diceValue, diceRolled, winner } = gameState;
  const [movingPiece, setMovingPiece] = useState(null);
  const [rolling, setRolling] = useState(false);
  const myColor = duelMode ? (duelMode.role === 'player1' ? 'R' : 'Y') : 'R';
  const isMyTurn = !duelMode || (bothReady && turn === myColor);

  const getValidMoves = (color, dictPieces, rollVal) => {
    let valid = [];
    if (!dictPieces[color]) return [];
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
      const newState = { ...gameState, diceValue: val, diceRolled: true };
      setGameState(newState);
      setRolling(false);
      if (duelMode) onMove({ type: 'ludo_state', ...newState });
    }, 600);
  };

  const executeMove = async (pieceId) => {
    if (movingPiece) return;
    
    let startPos = pieces[turn][pieceId];
    let steps = startPos === -1 ? 1 : diceValue;

    for (let i = 1; i <= steps; i++) {
        setMovingPiece({ color: turn, id: pieceId, pos: startPos === -1 ? 0 : startPos + i });
        await new Promise(r => setTimeout(r, 120));
    }
    setMovingPiece(null);

    let endPos = startPos === -1 ? 0 : startPos + diceValue;
    let newPieces = JSON.parse(JSON.stringify(pieces));
    newPieces[turn][pieceId] = endPos;

    // Capture logic
    let didCapture = false;
    if (endPos >= 0 && endPos < 52) {
      const absPos = (START_OFFSETS[turn] + endPos) % 52;
      if (!SAFE_ZONES.includes(absPos)) {
        const opps = Object.keys(pieces).filter(c => c !== turn);
        opps.forEach(oppColor => {
            newPieces[oppColor] = newPieces[oppColor].map(p => {
                if (p >= 0 && p < 52 && (START_OFFSETS[oppColor] + p) % 52 === absPos) {
                   didCapture = true;
                   return -1;
                }
                return p;
            });
        });
      }
    }

    const hasWon = newPieces[turn].every(p => p === 57);
    const newWinner = hasWon ? turn : winner;
    const rollAgain = (diceValue === 6 || didCapture) && !hasWon;
    const nextTurn = rollAgain ? turn : (turn === 'R' ? 'Y' : (turn === 'Y' ? 'B' : (turn === 'B' ? 'G' : 'R')));

    const newState = { pieces: newPieces, turn: nextTurn, diceValue: null, diceRolled: false, winner: newWinner };
    setGameState(newState);
    if (duelMode) onMove({ type: 'ludo_state', ...newState });
  };

  useEffect(() => {
    if (duelMode && opponentMove?.type === 'ludo_state') {
       if (!isMyTurn || isSpectator) setGameState(opponentMove);
    }
  }, [opponentMove, duelMode, isMyTurn, isSpectator]);

  return (
    <div className="flex flex-col items-center bg-[#021021] min-h-screen p-4 sm:p-8 font-sans">
       
       <div className="relative w-full max-w-[600px] aspect-square bg-[#f0f0f0] rounded-[3rem] p-4 shadow-[0_45px_100px_rgba(0,0,0,0.8),inset_0_-8px_10px_rgba(0,0,0,0.2)] border-[10px] border-[#e0b040]">
          
          <div className="relative w-full h-full grid grid-cols-15 grid-rows-15 bg-white rounded-3xl overflow-hidden shadow-inner border border-black/10">
             
             {/* Board Grid Overlay */}
             {Array(225).fill(0).map((_, i) => {
                const r = Math.floor(i / 15); const c = i % 15;
                const isR = r<6 && c<6; const isG = r<6 && c>8;
                const isB = r>8 && c<6; const isY = r>8 && c>8;
                const isPath = (r>=6 && r<=8) || (c>=6 && c<=8);
                const isSafe = PATH_DATA.some((p, idx) => p.r === r && p.c === c && SAFE_ZONES.includes(idx));
                
                // Entrance Paths
                const isREntrance = r === 7 && c >= 1 && c <= 5;
                const isGEntrance = c === 7 && r >= 1 && r <= 5;
                const isYEntrance = r === 7 && c >= 9 && c <= 13;
                const isBEntrance = c === 7 && r >= 9 && r <= 13;

                return (
                  <div key={i} className={`relative border-[0.5px] border-slate-200 
                    ${isR ? 'bg-[#D32F2F]' : ''} ${isG ? 'bg-[#388E3C]' : ''}
                    ${isB ? 'bg-[#1976D2]' : ''} ${isY ? 'bg-[#FBC02D]' : ''}
                    ${isREntrance ? 'bg-[#D32F2F]/20' : ''} ${isGEntrance ? 'bg-[#388E3C]/20' : ''}
                    ${isYEntrance ? 'bg-[#FBC02D]/20' : ''} ${isBEntrance ? 'bg-[#1976D2]/20' : ''}
                    ${(isREntrance || isGEntrance || isYEntrance || isBEntrance) ? 'border-[#333]/10 shadow-inner' : ''}
                  `}>
                    {/* Base Circles (Rounded Boxes in Image) */}
                    {( (r===0 && c===0) || (r===0 && c===9) || (r===9 && c===0) || (r===9 && c===9) ) && (
                        <div className="absolute inset-[6%] bg-black/5 rounded-[40px] shadow-[inset_0_4px_10px_rgba(0,0,0,0.2)]" />
                    )}
                    
                    {/* Safe Zone Icons */}
                    {isSafe && <Star className="absolute inset-0 m-auto w-4/5 h-4/5 text-white/40 fill-white/10" />}

                    {/* Entrance Arrows / Houses */}
                    {r===6 && c===1 && <ArrowRight className="absolute inset-0 m-auto w-3/4 h-3/4 text-red-600 opacity-80" />}
                    {r===1 && c===8 && <ArrowDown className="absolute inset-0 m-auto w-3/4 h-3/4 text-green-600 opacity-80" />}
                    {r===8 && c===13 && <ArrowLeft className="absolute inset-0 m-auto w-3/4 h-3/4 text-yellow-600 opacity-80" />}
                    {r===13 && c===6 && <ArrowUp className="absolute inset-0 m-auto w-3/4 h-3/4 text-blue-600 opacity-80" />}
                    
                    {r===7 && c===0 && <Home className="absolute inset-0 m-auto w-3/4 h-3/4 text-red-700/40" />}
                    {r===0 && c===7 && <Home className="absolute inset-0 m-auto w-3/4 h-3/4 text-green-700/40" />}
                    {r===14 && c===7 && <Home className="absolute inset-0 m-auto w-3/4 h-3/4 text-blue-700/40" />}
                    {r===7 && c===14 && <Home className="absolute inset-0 m-auto w-3/4 h-3/4 text-yellow-700/40" />}
                  </div>
                );
             })}

             {/* Center Home - Divided Triangles */}
             <div className="absolute top-[40%] left-[40%] w-[20%] h-[20%] z-10 border-4 border-white/20 shadow-2xl overflow-hidden bg-white">
                <div className="absolute inset-0 flex flex-wrap rotate-45 scale-150">
                    <div className="w-1/2 h-1/2 bg-[#D32F2F]" /> <div className="w-1/2 h-1/2 bg-[#388E3C]" />
                    <div className="w-1/2 h-1/2 bg-[#1976D2]" /> <div className="w-1/2 h-1/2 bg-[#FBC02D]" />
                </div>
                <div className="absolute inset-0 flex items-center justify-center z-20">
                   <div className="w-10 h-10 bg-white/10 backdrop-blur-md rounded-full flex items-center justify-center border border-white/20">
                      <Crown className="w-6 h-6 text-yellow-400 fill-yellow-400/20" />
                   </div>
                </div>
             </div>

             {/* Pieces Rendering */}
             {Object.entries(pieces).map(([color, pList]) => 
                pList.map((pos, id) => {
                  const isMoving = movingPiece?.color === color && movingPiece?.id === id;
                  const activePos = isMoving ? movingPiece.pos : pos;
                  const coords = getScreenCoords(color, activePos, id);
                  const canMove = diceRolled && isMyTurn && turn === color && getValidMoves(turn, pieces, diceValue).some(v => v.id === id);

                  return (
                    <motion.div
                      key={`${color}-${id}`}
                      style={{ top: `${(coords.r / 15) * 100}%`, left: `${(coords.c / 15) * 100}%` }}
                      initial={false}
                      animate={isMoving ? { y: [0, -35, 0], scale: [1, 1.3, 1] } : { y: 0, scale: 1 }}
                      transition={isMoving ? { duration: 0.15 } : { type: 'spring', stiffness: 200, damping: 20 }}
                      className="absolute w-[6.66%] h-[6.66%] z-30 p-[0.3rem]"
                    >
                      <Piece color={color} pPos={pos} isActive={canMove} onClick={() => canMove && executeMove(id)} />
                    </motion.div>
                  );
                })
             )}
          </div>
       </div>

       {/* Footer UI Bar (As per Image) */}
       <div className="w-full max-w-[640px] mt-10 grid grid-cols-5 gap-3 items-center">
          {/* Dice Box */}
          <div className="col-span-1 bg-white/5 backdrop-blur-lg border border-white/10 p-3 rounded-2xl flex flex-col items-center">
             <motion.div
               animate={rolling ? { rotate: 360 } : {}}
               onClick={handleRoll}
               className={`w-12 h-12 bg-white rounded-xl shadow-lg border-b-4 border-slate-300 flex items-center justify-center text-3xl font-black text-slate-800 cursor-pointer active:scale-90 transition-transform ${(!isMyTurn || diceRolled || winner) ? 'opacity-40' : ''}`}
             >
                {diceValue ? (['⚀', '⚁', '⚂', '⚃', '⚄', '⚅'][diceValue - 1]) : <Zap className="w-6 h-6 text-yellow-500" />}
             </motion.div>
          </div>

          {/* Player Cards */}
          {['R', 'B', 'G', 'Y'].map((c, i) => (
             <div key={c} className={`col-span-1 flex items-center gap-2 p-2 rounded-xl border transition-all ${turn === c ? 'bg-white/10 border-white/30 scale-105' : 'bg-black/20 border-white/5 opacity-50'}`}>
                <div className={`w-6 h-6 rounded-full flex items-center justify-center ${COLORS[c].bg}`}>
                   <div className="w-2 h-2 bg-white rounded-full opacity-50" />
                </div>
                <div className="flex flex-col">
                   <span className="text-[8px] font-black text-white/40 uppercase whitespace-nowrap">Joueur {i+1}</span>
                   <div className="flex gap-0.5">
                      {pieces[c]?.map((p, idx) => <div key={idx} className={`w-1 h-1 rounded-full ${p === 57 ? 'bg-green-400' : 'bg-white/20'}`} />)}
                   </div>
                </div>
                {turn === c && <div className="absolute -top-1 -right-1 w-2 h-2 bg-yellow-400 rounded-full animate-ping" />}
             </div>
          ))}
       </div>

    </div>
  );
};

export default Ludo;
