import React, { useState, useEffect, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { motion, AnimatePresence } from 'framer-motion';

// Generate Path Mathematically
const generatePaths = () => {
  const PATH = [];
  for(let c=1; c<=5; c++) PATH.push({r: 6, c});
  for(let r=5; r>=0; r--) PATH.push({r, c: 6});
  PATH.push({r: 0, c: 7}); PATH.push({r: 0, c: 8});
  for(let r=1; r<=5; r++) PATH.push({r, c: 8});
  for(let c=9; c<=14; c++) PATH.push({r: 6, c});
  PATH.push({r: 7, c: 14}); PATH.push({r: 8, c: 14});
  for(let c=13; c>=9; c--) PATH.push({r: 8, c});
  for(let r=9; r<=14; r++) PATH.push({r, c: 8});
  PATH.push({r: 14, c: 7}); PATH.push({r: 14, c: 6});
  for(let r=13; r>=9; r--) PATH.push({r, c: 6});
  for(let c=5; c>=0; c--) PATH.push({r: 8, c});
  PATH.push({r: 7, c: 0}); PATH.push({r: 6, c: 0});

  const HOMES = {
    R: [], Y: [], G: [], B: []
  };
  for(let c=1; c<=5; c++) HOMES.R.push({r: 7, c});
  for(let r=1; r<=5; r++) HOMES.G.push({r, c: 7});
  for(let c=13; c>=9; c--) HOMES.Y.push({r: 7, c});
  for(let r=13; r>=9; r--) HOMES.B.push({r, c: 7});

  return { PATH, HOMES };
};

const { PATH, HOMES } = generatePaths();

const START_OFFSETS = {
  R: 0,
  G: 13,
  Y: 26,
  B: 39
};

const SAFE_ZONES = [0, 8, 13, 21, 26, 34, 39, 47];

const getScreenCoordinates = (color, pos, id) => {
  if (pos === -1) {
    // Return base positions
    const bases = {
      R: [{r:2, c:2}, {r:2, c:3}, {r:3, c:2}, {r:3, c:3}],
      G: [{r:2, c:11}, {r:2, c:12}, {r:3, c:11}, {r:3, c:12}],
      Y: [{r:11, c:11}, {r:11, c:12}, {r:12, c:11}, {r:12, c:12}],
      B: [{r:11, c:2}, {r:11, c:3}, {r:12, c:2}, {r:12, c:3}],
    };
    return bases[color][id];
  }
  
  if (pos >= 52) {
    if (pos === 57) {
       // Center spot
       return {r: 7, c: 7}; // Victory overlaps slightly
    }
    return HOMES[color][pos - 52];
  }
  
  // Normal path
  const absPos = (START_OFFSETS[color] + pos) % 52;
  return PATH[absPos];
};

const Ludo = ({ onSubmit, duelMode, opponentMove, onMove, bothReady, isSpectator = false, playerNames }) => {
  const [gameState, setGameState] = useState(() => {
    if (duelMode?.recovered) return duelMode.recovered;
    if (duelMode?.gameData) return duelMode.gameData;
    return {
      pieces: {
        R: [-1, -1, -1, -1], // Pos -1 is Base. 57 is Done.
        Y: [-1, -1, -1, -1],
      },
      turn: 'R', // Red starts
      diceValue: null,
      diceRolled: false,
      winner: null
    };
  });

  const { pieces, turn, diceValue, diceRolled, winner } = gameState;
  const myColor = duelMode ? (duelMode.role === 'player1' ? 'R' : 'Y') : 'R';
  const isMyTurn = !duelMode || (bothReady && turn === myColor);
  const [mustRollAgain, setMustRollAgain] = useState(false);

  const getValidMoves = (color, dictPieces, rollVal) => {
    let valid = [];
    dictPieces[color].forEach((pos, id) => {
      if (pos === 57) return; // Done
      if (pos === -1) {
        if (rollVal === 6) valid.push({ id, pos });
      } else {
        if (pos + rollVal <= 57) valid.push({ id, pos });
      }
    });
    return valid;
  };

  const executeMove = useCallback((pieceId, remoteSync = false) => {
    let newPieces = JSON.parse(JSON.stringify(pieces));
    let startPos = newPieces[turn][pieceId];
    let endPos = startPos === -1 ? 0 : startPos + diceValue;
    
    newPieces[turn][pieceId] = endPos;

    let targetAbs = null;
    if (endPos >= 0 && endPos < 52) targetAbs = (START_OFFSETS[turn] + endPos) % 52;

    // Capture logic !
    let didCapture = false;
    if (targetAbs !== null && !SAFE_ZONES.includes(targetAbs)) {
      const oppColor = turn === 'R' ? 'Y' : 'R';
      newPieces[oppColor].forEach((oppPos, oppId) => {
        if (oppPos >= 0 && oppPos < 52) {
          let oppAbs = (START_OFFSETS[oppColor] + oppPos) % 52;
          if (oppAbs === targetAbs) {
            newPieces[oppColor][oppId] = -1; // Send back to base!
            didCapture = true;
          }
        }
      });
    }

    // Win condition check
    let hasWon = newPieces[turn].every(p => p === 57);
    let newWinner = hasWon ? turn : winner;

    // Turn resolution
    let rollAgain = didCapture || (diceValue === 6 && !hasWon);
    let nextTurn = rollAgain ? turn : (turn === 'R' ? 'Y' : 'R');

    const newState = {
      pieces: newPieces,
      turn: nextTurn,
      diceValue: null,
      diceRolled: false,
      winner: newWinner
    };

    setGameState(newState);
    
    if (duelMode && !remoteSync && myColor === turn) {
      onMove({ type: 'ludo_state', ...newState });
    }
  }, [pieces, turn, diceValue, duelMode, myColor, onMove, winner]);

  // Automatically pass turn if NO moves exist after dice roll
  useEffect(() => {
    if (diceRolled && !winner && turn === myColor) {
      const v = getValidMoves(turn, pieces, diceValue);
      if (v.length === 0) {
        setTimeout(() => {
           let newState = {
             ...gameState,
             turn: turn === 'R' ? 'Y' : 'R',
             diceRolled: false,
             diceValue: null
           };
           setGameState(newState);
           if (duelMode) onMove({ type: 'ludo_state', ...newState });
        }, 1000);
      }
    }
  }, [diceRolled, turn, pieces, diceValue, myColor, winner, duelMode, onMove, gameState]);

  useEffect(() => {
    if (winner && onSubmit) {
      setTimeout(() => onSubmit({ won: winner === myColor }), 2500);
    }
  }, [winner, onSubmit, myColor]);

  // Sync Remote Moves
  useEffect(() => {
    if (duelMode && opponentMove && opponentMove.type === 'ludo_state') {
       if (!isMyTurn || isSpectator) {
         setGameState({ 
           pieces: opponentMove.pieces, 
           turn: opponentMove.turn, 
           diceValue: opponentMove.diceValue, 
           diceRolled: opponentMove.diceRolled,
           winner: opponentMove.winner
         });
       }
    }
  }, [opponentMove, duelMode, isMyTurn, isSpectator]);

  const rollDice = () => {
    if (isSpectator || !isMyTurn || diceRolled || winner) return;
    const val = Math.floor(Math.random() * 6) + 1;
    const newState = {
      ...gameState,
      diceValue: val,
      diceRolled: true
    };
    setGameState(newState);
    if (duelMode) onMove({ type: 'ludo_state', ...newState });
  };

  const handlePieceClick = (color, id) => {
    if (isSpectator || !isMyTurn || color !== turn || !diceRolled || winner) return;
    const valid = getValidMoves(turn, pieces, diceValue);
    if (valid.some(m => m.id === id)) {
      executeMove(id, false);
    }
  };

  return (
    <div className={`flex flex-col ${isSpectator ? 'w-full h-full' : 'max-w-md mx-auto items-center'}`}>
       <div className="text-center py-2 flex flex-col items-center">
         <h2 className="text-2xl font-black text-white italic tracking-tight">LUDO MASTER</h2>
         <div className="bg-slate-900/50 px-4 py-1.5 rounded-full mt-2 border border-white/10 text-sm font-black tracking-widest uppercase">
           {winner ? (
              winner === myColor ? <span className="text-emerald-400">🏅 Victoire !</span> : <span className="text-red-400">💀 Défaite</span>
           ) : isSpectator ? (
             <span className={turn === 'R' ? 'text-red-400' : 'text-yellow-400'}>
               {turn === 'R' ? "Rouge joue" : "Jaune joue"}
               {diceRolled && <span className="ml-2 font-normal">🎲 {diceValue}</span>}
             </span>
           ) : (
             <span className={isMyTurn ? 'text-green-400 animate-pulse' : 'text-slate-400'}>
               {isMyTurn ? (diceRolled ? `Choisis un pion !` : `Lance le dé !`) : "Adversaire réfléchit..."}
             </span>
           )}
         </div>
       </div>

       <div className={`relative bg-amber-50 rounded-xl p-2 sm:p-3 max-w-[min(90vw,480px)] aspect-square self-center shadow-[0_15px_30px_rgba(0,0,0,0.8)] border-[3px] border-amber-900 ${isSpectator ? 'pointer-events-none mt-auto mb-auto' : 'mt-4'}`}>
          <div className="grid grid-cols-15 grid-rows-15 w-full h-full bg-slate-200 border-[1px] border-amber-900/40 relative">
             
             {/* Board 15x15 Map Underlay rendering goes here visually - we will simplify by just drawing squares that form the cross */}
             {Array(225).fill(0).map((_, i) => {
               const r = Math.floor(i / 15);
               const c = i % 15;
               let isPath = PATH.some(p => p.r === r && p.c === c) || 
                            HOMES.Y.some(p => p.r === r && p.c === c) || 
                            HOMES.R.some(p => p.r === r && p.c === c);
               let isSafe = PATH.some((p, abs) => p.r === r && p.c === c && SAFE_ZONES.includes(abs));
               
               return (
                 <div key={i} className={`
                   ${isPath ? 'border border-black/10' : ''}
                   ${isSafe ? 'bg-slate-300' : ''}
                   ${(r >= 0 && r < 6 && c >= 0 && c < 6) ? 'bg-red-600/90 shadow-[inset_0_4px_15px_rgba(0,0,0,0.4)]' : ''}
                   ${(r >= 9 && r < 15 && c >= 9 && c < 15) ? 'bg-yellow-500/90 shadow-[inset_0_4px_15px_rgba(0,0,0,0.4)]' : ''}
                   ${(r >= 0 && r < 6 && c >= 9 && c < 15) ? 'bg-green-600/90 shadow-[inset_0_4px_15px_rgba(0,0,0,0.4)]' : ''}
                   ${(r >= 9 && r < 15 && c >= 0 && c < 6) ? 'bg-blue-600/90 shadow-[inset_0_4px_15px_rgba(0,0,0,0.4)]' : ''}
                 `} />
               );
             })}

             {/* Drawing the actual pieces via Absolute positioning relative to grid cells! */}
             {['R', 'Y'].map(color => 
               pieces[color].map((pos, id) => {
                 let coord = getScreenCoordinates(color, pos, id);
                 let top = `${(coord.r / 15) * 100}%`;
                 let left = `${(coord.c / 15) * 100}%`;
                 
                 let isValid = diceRolled && isMyTurn && turn === color && getValidMoves(turn, pieces, diceValue).some(m => m.id === id);

                 return (
                   <motion.div 
                      key={`${color}-${id}`}
                      initial={false}
                      animate={{ top, left }}
                      transition={{ type: 'spring', stiffness: 200, damping: 20 }}
                      onClick={() => handleSquareClick(color, id)} // We map this wrapper below
                      className={`absolute w-[6.66%] h-[6.66%] p-[0.3rem] z-20`}
                   >
                     <div 
                        onClick={() => handlePieceClick(color, id)}
                        className={`w-full h-full rounded-full shadow-[0_3px_5px_rgba(0,0,0,0.6)] border-2 cursor-pointer
                         ${color === 'R' ? 'bg-gradient-to-br from-red-400 to-red-700 border-red-200' : 'bg-gradient-to-br from-yellow-300 to-yellow-600 border-yellow-100'}
                         ${isValid ? 'ring-[3px] ring-white animate-bounce' : ''}
                       `}
                     />
                   </motion.div>
                 );
               })
             )}
             
             {/* Dice Renderer */}
             <div className="absolute top-[40%] left-[40%] w-[20%] h-[20%] flex flex-col items-center justify-center pointer-events-none z-30">
               {!diceRolled && isMyTurn && !winner && (
                 <button 
                   onClick={(e) => { e.stopPropagation(); rollDice(); }}
                   className="pointer-events-auto bg-slate-900/90 text-white font-black text-[11px] sm:text-sm px-4 py-2 rounded-lg border-2 border-white/20 shadow-2xl hover:bg-slate-800 animate-pulse"
                 >
                   JETER LE DÉ
                 </button>
               )}
               {diceValue && (
                 <motion.div 
                   initial={{ rotateX: 360, rotateY: 360, scale: 0.5 }}
                   animate={{ rotateX: 0, rotateY: 0, scale: 1 }}
                   className={`w-10 h-10 sm:w-12 sm:h-12 bg-white rounded-lg shadow-2xl flex items-center justify-center border border-slate-200 pointer-events-none`}
                 >
                   <span className="text-3xl sm:text-4xl text-slate-800 font-bold">{
                     ['⚀', '⚁', '⚂', '⚃', '⚄', '⚅'][diceValue - 1]
                   }</span>
                 </motion.div>
               )}
             </div>

          </div>
       </div>
    </div>
  );
};

export default Ludo;
