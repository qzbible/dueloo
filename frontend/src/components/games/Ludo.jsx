import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, Star, Home, ArrowRight, ArrowLeft, ArrowUp, ArrowDown, Crown, Zap, Activity, Info } from 'lucide-react';
import Confetti from 'react-confetti';

/**
 * LUDO ROYAL - EXPERT UX/UI EDITION
 * Featuring: Neon Auras, Glassmorphism, Haptic Feedback, Parabolic Hopping.
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

const COLORS = {
  R: { main: '#F00', glow: 'shadow-[0_0_50px_rgba(239,68,68,0.4)]', name: 'Empire Rouge' },
  G: { main: '#0F0', glow: 'shadow-[0_0_50px_rgba(16,185,129,0.4)]', name: 'Dynastie Verte' },
  B: { main: '#00F', glow: 'shadow-[0_0_50px_rgba(59,130,246,0.4)]', name: 'Alliance Bleue' },
  Y: { main: '#FF0', glow: 'shadow-[0_0_50px_rgba(234,179,8,0.4)]', name: 'Royaume Jaune' },
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

const Ludo = ({ onSubmit, duelMode, opponentMove, onMove, bothReady, isSpectator = false }) => {
  const [gameState, setGameState] = useState(() => {
    const base = { pieces: { R: [-1, -1, -1, -1], Y: [-1, -1, -1, -1], G: [-1, -1, -1, -1], B: [-1, -1, -1, -1] }, turn: 'R', diceValue: null, diceRolled: false, winner: null, log: [] };
    return (duelMode?.recovered?.pieces || duelMode?.gameData?.pieces) ? (duelMode.recovered || duelMode.gameData) : base;
  });

  const { pieces, turn, diceValue, diceRolled, winner, log } = gameState;
  const [movingPiece, setMovingPiece] = useState(null);
  const [rolling, setRolling] = useState(false);
  const [shake, setShake] = useState(false);
  const [lastCapture, setLastCapture] = useState(null);

  const myColor = duelMode ? (duelMode.role === 'player1' ? 'R' : 'Y') : 'R';
  const isMyTurn = !duelMode || (bothReady && turn === myColor);

  const addLog = (msg) => {
    setGameState(prev => ({ ...prev, log: [msg, ...prev.log].slice(0, 5) }));
  };

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
    setShake(true);
    setTimeout(() => setShake(false), 200);
    
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
                   setLastCapture({ r: PATH_DATA[absPos].r, c: PATH_DATA[absPos].c });
                   setTimeout(() => setLastCapture(null), 1000);
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
    <div className="flex flex-col items-center bg-[#070b14] min-h-screen p-4 sm:p-10 font-sans transition-colors duration-500 overflow-hidden">
       {winner && <Confetti width={window.innerWidth} height={window.innerHeight} recycle={false} />}
       
       {/* Ambient Aura Background */}
       <div className={`fixed inset-0 pointer-events-none transition-all duration-1000 opacity-20 
          ${turn === 'R' ? 'bg-red-500' : turn === 'G' ? 'bg-green-500' : turn === 'B' ? 'bg-blue-500' : 'bg-yellow-500'}`} 
       />

       {/* HEADER ACTION CENTER */}
       <div className="w-full max-w-[700px] flex items-center justify-between gap-6 mb-10 relative z-10">
          {/* Action Log Glass Panel */}
          <div className="flex-1 glass p-4 rounded-3xl border border-white/10 shadow-2xl h-24 overflow-hidden">
             <div className="flex items-center gap-2 mb-2 text-[10px] font-black text-blue-400 uppercase tracking-widest opacity-60">
                <Activity className="w-3 h-3" /> Live Feed
             </div>
             <div className="flex flex-col gap-1 text-xs font-bold text-white/80 italic">
                {log.length > 0 ? log.map((l, i) => <div key={i} className="animate-in slide-in-from-left duration-300">{l}</div>) : "Le match commence..."}
                {diceRolled && <div className="text-blue-400 animate-pulse">Lancer : {diceValue}</div>}
             </div>
          </div>
          
          {/* Pro Dice Widget */}
          <motion.div 
            animate={shake ? { x: [-2, 2, -2, 2, 0] } : {}}
            className="glass-dark p-2 rounded-[2rem] border border-white/20 shadow-2xl"
          >
             <div 
               onClick={handleRoll}
               className={`w-20 h-20 bg-white rounded-2xl shadow-inner flex items-center justify-center text-5xl font-black text-slate-900 cursor-pointer active:scale-95 transition-all
                 ${(!isMyTurn || diceRolled || winner) ? 'opacity-40 grayscale pointer-events-none' : 'hover:shadow-[0_0_30px_rgba(255,255,255,0.3)]'}
               `}
             >
                {rolling ? (
                  <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 0.5 }}>
                     <Zap className="w-10 h-10 text-yellow-500" />
                  </motion.div>
                ) : (diceValue ? (['⚀', '⚁', '⚂', '⚃', '⚄', '⚅'][diceValue - 1]) : <Zap className="w-8 h-8 text-slate-300" />)}
             </div>
          </motion.div>
       </div>

       {/* LIVING BOARD CONTAINER */}
       <motion.div 
          animate={shake ? { x: [-5, 5, -5, 5, 0], y: [-3, 3, -3, 3, 0] } : {}}
          className={`relative w-full max-w-[560px] aspect-square bg-[#0a0f1e] rounded-[3.5rem] p-5 shadow-[0_60px_120px_-20px_rgba(0,0,0,1)] border-[1px] border-white/10 transition-all duration-700 ${COLORS[turn].glow}`}
       >
          <div className="relative w-full h-full grid grid-cols-15 grid-rows-15 bg-[#161b2a] rounded-[2.5rem] overflow-hidden shadow-inner p-1">
             
             {/* Cell Rendering with Expert Styling */}
             {Array(225).fill(0).map((_, i) => {
                const r = Math.floor(i / 15); const c = i % 15;
                const isR = r<6 && c<6; const isG = r<6 && c>8;
                const isB = r>8 && c<6; const isY = r>8 && c>8;
                const isSafe = PATH_DATA.some((p, idx) => p.r === r && p.c === c && SAFE_ZONES.includes(idx));
                const isEntrance = (r === 7 && (c === 1 || c===2 || c===3 || c===4 || c===5)) || 
                                   (r === 7 && (c === 9 || c===10 || c===11 || c===12 || c===13)) ||
                                   (c === 7 && (r === 1 || r===2 || r===3 || r===4 || r===5)) ||
                                   (c === 7 && (r === 9 || r===10 || r===11 || r===12 || r===13));

                return (
                  <div key={i} className={`relative border-[0.5px] border-white/5 transition-colors duration-300
                    ${isR ? 'bg-red-500/80 shadow-[inset_0_4px_15px_rgba(0,0,0,0.5)]' : ''}
                    ${isG ? 'bg-emerald-600/80 shadow-[inset_0_4px_15px_rgba(0,0,0,0.5)]' : ''}
                    ${isB ? 'bg-blue-600/80 shadow-[inset_0_4px_15px_rgba(0,0,0,0.5)]' : ''}
                    ${isY ? 'bg-yellow-500/80 shadow-[inset_0_4px_15px_rgba(0,0,0,0.5)]' : ''}
                    ${isSafe ? 'bg-white/10 backdrop-blur-sm shadow-inner' : ''}
                    ${isEntrance ? 'bg-white/5' : ''}
                  `}>
                    {isSafe && <Star className="absolute inset-0 m-auto w-3 h-3 text-yellow-400 opacity-40 fill-yellow-400/20" />}
                    
                    {/* Icons from Reference Match */}
                    {r===6 && c===1 && <ArrowRight className="absolute inset-0 m-auto w-3 h-3 text-red-400 opacity-60" />}
                    {r===1 && c===8 && <ArrowDown className="absolute inset-0 m-auto w-3 h-3 text-emerald-400 opacity-60" />}
                    {r===8 && c===13 && <ArrowLeft className="absolute inset-0 m-auto w-3 h-3 text-yellow-400 opacity-60" />}
                    {r===13 && c===6 && <ArrowUp className="absolute inset-0 m-auto w-3 h-3 text-blue-400 opacity-60" />}
                    
                    {r===7 && c===0 && <Home className="absolute inset-0 m-auto w-3 h-3 text-red-500/30" />}
                  </div>
                );
             })}

             {/* Center Trophy Zone */}
             <div className="absolute top-[40%] left-[40%] w-[20%] h-[20%] z-20 border-2 border-white/10 glass-dark bg-white/5 rounded-2xl overflow-hidden flex items-center justify-center">
                <motion.div animate={{ rotate: 360 }} transition={{ duration: 20, repeat: Infinity, ease: "linear" }} className="absolute inset-0 opacity-10">
                   <div className="w-full h-full bg-[conic-gradient(from_0deg,#ff0,#000,#ff0)]" />
                </motion.div>
                <div className="relative z-30 w-12 h-12 glass flex items-center justify-center rounded-full border border-white/20 shadow-2xl">
                   <Trophy className={`w-6 h-6 text-yellow-400 drop-shadow-[0_0_10px_orange]`} />
                </div>
             </div>

             {/* Impact Waves for captures */}
             <AnimatePresence>
                {lastCapture && (
                  <motion.div 
                    initial={{ scale: 0, opacity: 1 }}
                    animate={{ scale: 5, opacity: 0 }}
                    exit={{ opacity: 0 }}
                    style={{ top: `${(lastCapture.r / 15) * 100}%`, left: `${(lastCapture.c / 15) * 100}%` }}
                    className="absolute w-[6.66%] h-[6.66%] z-40 bg-white rounded-full border-4 border-yellow-400 pointer-events-none"
                  />
                )}
             </AnimatePresence>

             {/* Piece Rendering - EXPERT PIECES */}
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
                      animate={isMoving ? { y: [0, -45, 0], scale: [1, 1.4, 1], zIndex: 100 } : { y: 0, scale: 1, zIndex: 30 }}
                      transition={isMoving ? { duration: 0.12 } : { type: 'spring', stiffness: 200, damping: 20 }}
                      className="absolute w-[6.66%] h-[6.66%] p-[0.35rem]"
                    >
                      <button
                        onClick={() => canMove && executeMove(id)}
                        disabled={!canMove}
                        className={`w-full h-full rounded-full relative group transition-all duration-300
                          ${color === 'R' ? 'bg-gradient-to-t from-red-900 via-red-600 to-red-400 shadow-[0_8px_20px_rgba(239,68,68,0.4)]' : 
                            color === 'Y' ? 'bg-gradient-to-t from-yellow-700 via-yellow-500 to-yellow-300 shadow-[0_8px_20px_rgba(234,179,8,0.4)]' :
                            color === 'G' ? 'bg-gradient-to-t from-emerald-900 via-emerald-600 to-emerald-400 shadow-[0_8px_20px_rgba(16,185,129,0.4)]' :
                            'bg-gradient-to-t from-blue-900 via-blue-600 to-blue-400 shadow-[0_8px_20px_rgba(37,99,235,0.4)]'}
                          ${canMove ? 'cursor-pointer ring-4 ring-white animate-pulse' : 'cursor-default'}
                        `}
                      >
                        {/* High-End Reflective Lighting */}
                        <div className="absolute top-1 left-2 w-1/2 h-1/3 bg-white/50 rounded-full blur-[1px] opacity-60" />
                        <div className="absolute bottom-1 right-2 w-2 h-2 bg-black/40 rounded-full blur-[1px]" />
                        {pos === 57 && <Crown className="absolute inset-0 m-auto w-12/2 h-1/2 text-white/40" />}
                      </button>
                      
                      {/* Trail effect when moving */}
                      {isMoving && <div className="absolute inset-0 bg-white/20 rounded-full blur-xl animate-ping" />}
                    </motion.div>
                  );
                })
             )}
          </div>
       </motion.div>

       {/* EXPERT STATUS PANEL - GLASSMORPHISM */}
       <div className="mt-12 w-full max-w-xl grid grid-cols-4 gap-4 relative z-10">
          {['R', 'G', 'B', 'Y'].map((c, i) => (
             <div key={c} className={`p-4 rounded-3xl border transition-all duration-500 
                ${turn === c ? 'bg-white/10 border-white/30 scale-110 shadow-2xl backdrop-blur-xl' : 'bg-black/40 border-white/5 opacity-30 grayscale'}`}>
                <div className="flex flex-col items-center gap-2">
                   <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shadow-lg
                      ${c === 'R' ? 'bg-red-500' : c === 'Y' ? 'bg-yellow-500' : c === 'G' ? 'bg-emerald-500' : 'bg-blue-600'}`}>
                      <span className="text-white text-xs font-black">P{i+1}</span>
                   </div>
                   <div className="flex gap-1">
                      {pieces[c]?.map((p, idx) => (
                         <div key={idx} className={`w-2 h-2 rounded-full ${p === 57 ? 'bg-emerald-400 shadow-[0_0_8px_green]' : 'bg-white/20'}`} />
                      ))}
                   </div>
                </div>
             </div>
          ))}
       </div>

       <style dangerouslySetInnerHTML={{ __html: `
         .glass { background: rgba(255, 255, 255, 0.05); backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px); }
         .glass-dark { background: rgba(0, 0, 0, 0.4); backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px); }
       `}} />
    </div>
  );
};

export default Ludo;
