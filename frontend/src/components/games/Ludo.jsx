import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// ─── BOARD GEOMETRY ──────────────────────────────────────────────────────────
// Each cell in the 15×15 grid has a type:
//   'r-base' | 'g-base' | 'y-base' | 'b-base'  — the 6×6 colored quadrants
//   'r-home' | 'g-home' | 'y-home' | 'b-home'  — colored home-stretch columns/rows
//   'center'  — the trophy cell at (7,7)
//   'path'    — white cross-arm cells (safe or normal)
const getCellType = (r, c) => {
  if (r <= 5 && c <= 5) return 'r-base';
  if (r <= 5 && c >= 9) return 'g-base';
  if (r >= 9 && c >= 9) return 'y-base';
  if (r >= 9 && c <= 5) return 'b-base';
  if (r === 7 && c === 7) return 'center';
  if (r === 7 && c >= 1 && c <= 6) return 'r-home';
  if (c === 7 && r >= 1 && r <= 6) return 'g-home';
  if (r === 7 && c >= 8 && c <= 13) return 'y-home';
  if (c === 7 && r >= 8 && r <= 13) return 'b-home';
  return 'path';
};

// ─── MAIN PATH (52 cells, clockwise, referenced from Red's perspective) ──────
const buildMainPath = () => {
  const p = [];
  // Red segment (13): row6 arm + col6 up + top bridge
  for (let c = 1; c <= 5; c++)  p.push([6, c]);      // idx 0-4   (5)
  for (let r = 5; r >= 0; r--) p.push([r, 6]);        // idx 5-10  (6)
  p.push([0, 7]); p.push([0, 8]);                     // idx 11-12 (2) → total 13

  // Green segment (13): col8 down (6) + arm cols 9-12 (4) + right bridge (3)
  for (let r = 1; r <= 6; r++)  p.push([r, 8]);       // idx 13-18 (6)
  for (let c = 9; c <= 12; c++) p.push([6, c]);        // idx 19-22 (4)
  p.push([6, 13]); p.push([7, 14]); p.push([8, 14]);  // idx 23-25 (3) → total 13

  // Yellow segment (13): arm row8 cols 13-9 (5) + col8 down rows 9-14 (6) + bottom bridge (2)
  for (let c = 13; c >= 9; c--) p.push([8, c]);       // idx 26-30 (5)
  for (let r = 9; r <= 14; r++)  p.push([r, 8]);      // idx 31-36 (6)
  p.push([14, 7]); p.push([14, 6]);                   // idx 37-38 (2) → total 13

  // Blue segment (13): col6 up rows 13-9 (5) + arm row8 cols 5-1 (5) + left bridge (3)
  for (let r = 13; r >= 9; r--) p.push([r, 6]);       // idx 39-43 (5)
  for (let c = 5; c >= 1; c--)  p.push([8, c]);       // idx 44-48 (5)
  p.push([8, 0]); p.push([7, 0]); p.push([6, 0]);     // idx 49-51 (3) → total 13

  // 4 × 13 = 52 ✓
  return p;
};
const MAIN_PATH = buildMainPath();

// Home-stretch paths (6 cells each, ending just before center)
const HOME_PATH = {
  R: [[7,1],[7,2],[7,3],[7,4],[7,5],[7,6]],
  G: [[1,7],[2,7],[3,7],[4,7],[5,7],[6,7]],
  Y: [[7,13],[7,12],[7,11],[7,10],[7,9],[7,8]],
  B: [[13,7],[12,7],[11,7],[10,7],[9,7],[8,7]],
};

// Starting index on MAIN_PATH for each color
// R=0→[6,1]  G=13→[1,8]  Y=26→[8,13]  B=39→[13,6]
const SPAWN_IDX = { R: 0, G: 13, Y: 26, B: 39 };

// Safe (starred) cells on the main path — key = "r,c"
const SAFE = new Set([
  '6,1','1,8','8,13','13,6',    // spawn cells
  '2,6','6,12','12,8','8,2',    // midpoint safe zones
  '0,8','6,6','8,0','14,6',     // corner-turn safe zones
]);

// Base staging spots for each piece 0-3
const BASE_SPOTS = {
  R: [[2,2],[2,3],[3,2],[3,3]],
  G: [[2,11],[2,12],[3,11],[3,12]],
  Y: [[11,11],[11,12],[12,11],[12,12]],
  B: [[11,2],[11,3],[12,2],[12,3]],
};

// Resolve board coordinates for a piece
// pos=-1  → base
// pos<-1  → jail (e.g., -10=R base, -20=G, -30=Y, -40=B)
// 0-51    → main path
// 52-57   → home stretch
const getCoord = (color, pos, id) => {
  if (pos === -1) return BASE_SPOTS[color][id];
  if (pos <= -10) {
    const jailColor = { '-10':'R', '-20':'G', '-30':'Y', '-40':'B' }[pos];
    return BASE_SPOTS[jailColor][id];
  }
  if (pos === 57)  return [7, 7];
  if (pos >= 52)   return HOME_PATH[color][pos - 52] ?? [7, 7];
  return MAIN_PATH[(SPAWN_IDX[color] + pos) % 52];
};

// ─── VALID MOVES ──────────────────────────────────────────────────────────────
const getValid = (color, pieces, dice) =>
  (pieces[color] ?? []).reduce((acc, pos, id) => {
    if (pos === 57) return acc;
    // Release from jail to own base
    if (pos <= -10 && dice === 6) return [...acc, id];
    // Move from base to spawn
    if (pos === -1 && dice === 6) return [...acc, id];
    // Normal move
    if (pos >= 0 && pos + dice <= 57) return [...acc, id];
    return acc;
  }, []);

// ─── STYLE MAP ────────────────────────────────────────────────────────────────
const COLOR_META = {
  R: { main:'#cc1a1a', dark:'#7a0000', light:'#ff6666', ring:'ring-red-300',    glow:'#ef4444', label:'Rouge' },
  G: { main:'#1a8a2a', dark:'#004d00', light:'#55dd55', ring:'ring-green-300',  glow:'#22c55e', label:'Vert'  },
  Y: { main:'#c4940a', dark:'#7a5a00', light:'#ffe066', ring:'ring-yellow-200', glow:'#eab308', label:'Jaune' },
  B: { main:'#1a4fcc', dark:'#002080', light:'#6699ff', ring:'ring-blue-300',   glow:'#3b82f6', label:'Bleu'  },
};

// Color for bg-* usage in status bar
const BG_CLASS = { R:'bg-red-600', G:'bg-green-600', Y:'bg-yellow-500', B:'bg-blue-600' };

// SVG Ludo pin — exact shape from classic board games
const LudoPin = ({ color, canMove, onClick }) => {
  const m = COLOR_META[color];
  return (
    <button
      onClick={onClick}
      disabled={!canMove}
      className={`w-full h-full flex items-center justify-center bg-transparent border-0 p-0
        ${canMove ? `cursor-pointer ${m.ring} ring-2 ring-offset-0 rounded-full animate-bounce` : 'cursor-default'}`}
      style={{ outline:'none' }}
    >
      <svg viewBox="0 0 40 56" xmlns="http://www.w3.org/2000/svg"
        className="w-[88%] h-[88%] drop-shadow-[0_4px_6px_rgba(0,0,0,0.55)]">
        <defs>
          <radialGradient id={`head-${color}`} cx="38%" cy="30%" r="60%">
            <stop offset="0%"  stopColor={m.light} />
            <stop offset="55%" stopColor={m.main}  />
            <stop offset="100%" stopColor={m.dark} />
          </radialGradient>
          <radialGradient id={`base-${color}`} cx="50%" cy="20%" r="70%">
            <stop offset="0%"  stopColor={m.main}  />
            <stop offset="100%" stopColor={m.dark} />
          </radialGradient>
        </defs>
        {/* ── Socle (base) ── */}
        <ellipse cx="20" cy="50" rx="16" ry="5" fill={m.dark} opacity="0.5" />
        <path d="M6 46 Q6 54 20 54 Q34 54 34 46 L30 40 Q30 44 20 44 Q10 44 10 40 Z"
          fill={`url(#base-${color})`} />
        {/* ── Col (neck) ── */}
        <rect x="15" y="26" width="10" height="16" rx="4" fill={m.main} />
        <rect x="16.5" y="26" width="4" height="16" rx="2" fill={m.light} opacity="0.35" />
        {/* ── Tête (head sphere) ── */}
        <circle cx="20" cy="18" r="14" fill={`url(#head-${color})`} />
        {/* ── Reflet spéculaire ── */}
        <ellipse cx="15" cy="12" rx="5" ry="4" fill="white" opacity="0.45" />
      </svg>
    </button>
  );
};

const CELL_BG = {
  'r-base':  'bg-red-600',
  'g-base':  'bg-green-600',
  'y-base':  'bg-yellow-500',
  'b-base':  'bg-blue-600',
  'r-home':  'bg-red-400',
  'g-home':  'bg-green-400',
  'y-home':  'bg-yellow-300',
  'b-home':  'bg-blue-400',
  'center':  'bg-white',
  'path':    'bg-white',
};

const DICE_FACES = ['⚀','⚁','⚂','⚃','⚄','⚅'];

// ─── HELPERS ─────────────────────────────────────────────────────────────────
const nextColor = c => ({ R:'G', G:'Y', Y:'B', B:'R' }[c]);
const sleep = ms  => new Promise(r => setTimeout(r, ms));
const clone = obj => JSON.parse(JSON.stringify(obj));

// ─── INITIAL STATE ────────────────────────────────────────────────────────────
const INIT = {
  pieces: { R:[-1,-1,-1,-1], G:[-1,-1,-1,-1], Y:[-1,-1,-1,-1], B:[-1,-1,-1,-1] },
  turn: 'R', dice: null, rolled: false, winner: null,
};

const Ludo = ({ onSubmit, duelMode, opponentMove, opponentMoveQueue, onMove, bothReady, isSpectator = false }) => {

  const [gs, setGs]               = useState(() => {
    const saved = duelMode?.recovered?.pieces ? duelMode.recovered
                : duelMode?.gameData?.pieces  ? duelMode.gameData : null;
    return saved ?? INIT;
  });
  const gsRef                      = useRef(gs);          // always fresh state
  const [animPiece, setAnimPiece]  = useState(null);
  const [rolling, setRolling]      = useState(false);
  const [shakeBoard, setShakeBoard]= useState(false);
  const [captureKey, setCaptureKey]= useState(null);
  const aiRunningRef               = useRef(false);

  // Keep gsRef in sync
  useEffect(() => { gsRef.current = gs; }, [gs]);

  const { pieces, turn, dice, rolled, winner } = gs;

  // ── GAME MODE DETECTION ───────────────────────────────────────────────────────
  const isAIMode      = duelMode?.config?.opponent === 'ia';
  const isMultiplayer = !!(duelMode?.matchId || duelMode?.gameData?.match_id);
  const maxP          = duelMode?.max_players || 
                        duelMode?.gameData?.max_players || 
                        duelMode?.config?.specifics?.max_players || 2;

  // Color mapping: 2p=R/B, 3p=R/B/G(vert), 4p=R/G/Y/B
  // Unified Color mapping following board rotation: R(TL), G(TR), Y(BR), B(BL)
  // Mapping roles to colors to support 2, 3, or 4 players
  const ROLE_COLOR    = maxP === 2 ? { player1:'R', player2:'B' } :
                        maxP === 3 ? { player1:'R', player2:'B', player3:'G' } : 
                                     { player1:'R', player2:'G', player3:'Y', player4:'B' };

  const myRole        = duelMode?.role || 'player1';
  const myColor       = ROLE_COLOR[myRole] || 'R';
  const isHumanTurn   = !isSpectator && turn === myColor && (!isMultiplayer || bothReady);
  
  // AI plays if it's AI mode AND it's not the human's turn.
  // In multiplayer (spectatable) AI games, ONLY player1 (host) runs the AI locally.
  const isAITurn      = isAIMode && !isSpectator && turn !== myColor && !winner && 
                        (!isMultiplayer || myRole === 'player1');

  const validIds      = rolled ? getValid(turn, pieces, dice) : [];

  // ── NEXT PLAYER ───────────────────────────────────────────────────────────────
  const getNextPlayer = useCallback((curr) => {
    // Clockwise: Red (TL) -> Green (TR) -> Yellow (BR) -> Blue (BL)
    const fullList = ['R', 'G', 'Y', 'B'];
    const activeColors = Object.values(ROLE_COLOR);
    const activeList = fullList.filter(c => activeColors.includes(c)); // Subsequence of R-G-Y-B
    
    const idx = activeList.indexOf(curr);
    if (idx === -1) return activeList[0];
    return activeList[(idx + 1) % activeList.length];
  }, [ROLE_COLOR]);


  // ── APPLY MOVE (pure calculation + setState) ───────────────────────────────────
  const applyMove = useCallback((state, pieceId, diceVal) => {
    const { turn: t, pieces: p } = state;
    const startPos = p[t][pieceId];
    
    let endPos;
    if (startPos <= -10) endPos = -1; // Jail -> Own Base
    else if (startPos === -1) endPos = 0; // Own Base -> Spawn
    else endPos = startPos + diceVal; // Path increment

    const newPieces = clone(p);
    newPieces[t][pieceId] = endPos;

    let didCapture = false;
    const JAIL_VALS = { R: -10, G: -20, Y: -30, B: -40 };

    if (endPos >= 0 && endPos < 52) {
      const absEnd  = (SPAWN_IDX[t] + endPos) % 52;
      const [er, ec] = MAIN_PATH[absEnd];
      const cellKey  = `${er},${ec}`;
      if (!SAFE.has(cellKey)) {
        for (const opp of Object.keys(newPieces).filter(c => c !== t)) {
          newPieces[opp] = newPieces[opp].map(pp => {
            if (pp >= 0 && pp < 52 && (SPAWN_IDX[opp] + pp) % 52 === absEnd) {
              didCapture = true;
              setCaptureKey(cellKey);
              setTimeout(() => setCaptureKey(null), 800);
              return JAIL_VALS[opp]; // Now jailed in their own base
            }
            return pp;
          });
        }
      }
    }

    const won       = newPieces[t].every(pp => pp === 57);
    const rollAgain = (diceVal === 6 || didCapture) && !won;
    return {
      pieces:  newPieces,
      turn:    rollAgain ? t : getNextPlayer(t),
      dice:    null,
      rolled:  false,
      winner:  won ? t : null,
    };
  }, [getNextPlayer]);

  // ── PIECE MOVE (with animation) ────────────────────────────────────────────────
  const doMove = useCallback(async (pieceId) => {
    if (animPiece) return;
    const { turn: t, pieces: p, dice: d } = gsRef.current;
    
    // Broadcast animation start so opponent sees the exact physics!
    if (isMultiplayer && onMove) onMove({ type: 'ludo_anim', color: t, pieceId, diceVal: d, id: Math.random().toString() });
    
    const startPos = p[t][pieceId];
    
    // Jail -> Base jump (no step animation)
    if (startPos <= -10) {
      setAnimPiece({ color: t, id: pieceId, pos: -1 });
      await sleep(150);
      setAnimPiece(null);
    } else {
      const steps = startPos === -1 ? 1 : d;
      for (let i = 1; i <= steps; i++) {
        setAnimPiece({ color: t, id: pieceId, pos: startPos === -1 ? 0 : startPos + i });
        await sleep(60);
      }
      setAnimPiece(null);
    }

    const next = applyMove(gsRef.current, pieceId, d);
    setGs(next);
    if (isMultiplayer && onMove) onMove({ type: 'ludo_state', id: Math.random().toString(), ...next });
    if (next.winner && onSubmit) setTimeout(() => onSubmit({ won: next.winner === myColor }), 2000);
  }, [animPiece, applyMove, isMultiplayer, myColor, onMove, onSubmit]);

  // ── REMOTE PIECE MOVE (for visual sync only) ──────────────────────────────────
  const doMoveRemote = useCallback(async (color, pieceId, d) => {
    if (animPiece) return;
    const startPos = gsRef.current.pieces[color][pieceId];
    
    if (startPos <= -10) {
      setAnimPiece({ color, id: pieceId, pos: -1 });
      await sleep(150);
      setAnimPiece(null);
    } else {
      const steps = startPos === -1 ? 1 : d;
      for (let i = 1; i <= steps; i++) {
        setAnimPiece({ color, id: pieceId, pos: startPos === -1 ? 0 : startPos + i });
        await sleep(60);
      }
      setAnimPiece(null);
    }
  }, [animPiece]);

  // ── HUMAN DICE ROLL ───────────────────────────────────────────────────────────
  const doRoll = () => {
    if (isSpectator || !isHumanTurn || rolled || rolling || winner) return;
    setRolling(true);
    setShakeBoard(true);
    
    if (isMultiplayer && onMove) onMove({ type: 'ludo_rolling', id: Math.random().toString() });

    setTimeout(() => setShakeBoard(false), 300);
    setTimeout(() => {
      const val = Math.floor(Math.random() * 6) + 1;
      setGs(prev => ({ ...prev, dice: val, rolled: true }));
      setRolling(false);
      
      if (isMultiplayer && onMove) onMove({ type: 'ludo_dice', diceVal: val, id: Math.random().toString() });
    }, 500);
  };

  // ── AUTO-PASS WHEN NO VALID MOVES ─────────────────────────────────────────────
  useEffect(() => {
    if (rolled && !rolling && !winner && !isAITurn && validIds.length === 0) {
      const t = setTimeout(() => {
        setGs(prev => {
          const next = { ...prev, dice: null, rolled: false, turn: getNextPlayer(prev.turn) };
          if (isMultiplayer && onMove) onMove({ type: 'ludo_state', id: Math.random().toString(), ...next });
          return next;
        });
      }, 1000);
      return () => clearTimeout(t);
    }
  }, [rolled, rolling, winner, isAITurn, validIds.length, getNextPlayer, isMultiplayer, onMove]);


  // ── AI ENGINE ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isAITurn) return;
    if (rolling || animPiece || winner || aiRunningRef.current || rolled) return;
    
    const runAI = async () => {
      aiRunningRef.current = true;
      try {
        await sleep(1000);
        
        // 1. Roll the dice
        if (isMultiplayer && onMove) onMove({ type: 'ludo_rolling', id: Math.random().toString() });
        setRolling(true);
        setShakeBoard(true);
        setTimeout(() => setShakeBoard(false), 300);
        await sleep(600);
        const val = Math.floor(Math.random() * 6) + 1;
        
        // Force the AI's roll into the global state so the human spectator sees it
        if (isMultiplayer && onMove) onMove({ type: 'ludo_dice', diceVal: val, id: Math.random().toString() });
        setGs(prev => ({ ...prev, dice: val, rolled: true }));
        setRolling(false);
        
        // Wait long enough for the human player to read the AI's dice roll!
        await sleep(1500);

        // 2. Read latest state and valid moves
        const current = gsRef.current;
        const valid   = getValid(current.turn, current.pieces, val);

        // If the AI has no valid moves (e.g. rolled a 3 while stuck in base), pass turn clearly
        if (valid.length === 0) {
          const next = { ...current, dice: null, rolled: false, turn: getNextPlayer(current.turn) };
          setGs(next);
          if (isMultiplayer && onMove) onMove({ type: 'ludo_state', id: Math.random().toString(), ...next });
          return;
        }

        // 3. Choice of move
        const chosenId = valid[Math.floor(Math.random() * valid.length)];
        await sleep(400);

        // 4. Animate & apply
        await doMove(chosenId); 
      } catch (err) {
        console.error("[Ludo AI] Error in runAI:", err);
      } finally {
        aiRunningRef.current = false;
      }
    };

    runAI();
  }, [turn, rolled, isAITurn, winner, animPiece, rolling, doMove, getNextPlayer]);

  // ── REMOTE SYNC ───────────────────────────────────────────────────────────────
  const processedIndexRef = useRef(0);
  const queueRunningRef   = useRef(false);

  const queueRef = useRef([]);
  useEffect(() => { queueRef.current = opponentMoveQueue; }, [opponentMoveQueue]);

  useEffect(() => {
    if (!isMultiplayer || !opponentMoveQueue || opponentMoveQueue.length === 0) return;
    if (queueRunningRef.current) return; // Prevent concurrent queue parsing instances

    const processQueue = async () => {
      queueRunningRef.current = true;
      try {
        while (processedIndexRef.current < queueRef.current.length) {
          const opMove = queueRef.current[processedIndexRef.current];

          if (opMove.type === 'ludo_rolling') {
            setRolling(true);
            setShakeBoard(true);
            await sleep(300);
            setShakeBoard(false);
          } 
          else if (opMove.type === 'ludo_dice') {
            setGs(prev => {
              const fresh = { ...prev, dice: opMove.diceVal, rolled: true };
              gsRef.current = fresh; // Sync math for impending animations within same queue
              return fresh;
            });
            setRolling(false);
          }
          else if (opMove.type === 'ludo_anim') {
            await doMoveRemote(opMove.color, opMove.pieceId, opMove.diceVal);
          }
          else if (opMove.type === 'ludo_state') {
            setGs(opMove);
            gsRef.current = opMove; // Sync math unconditionally
          }
          
          processedIndexRef.current++;
          await sleep(20); // Small DOM flush buffer
        }
      } finally {
        queueRunningRef.current = false;
      }
    };
    
    processQueue();
  }, [opponentMoveQueue, isMultiplayer, doMoveRemote]);

  // ── PIECE-POSITION LOOKUP MAP ─────────────────────────────────────────────────
  const pieceAt = {};
  Object.entries(pieces).forEach(([color, list]) => {
    list.forEach((pos, id) => {
      const isMovingThis = animPiece?.color === color && animPiece?.id === id;
      const activePos    = isMovingThis ? animPiece.pos : pos;
      const [r, c]       = getCoord(color, activePos, id);
      const key = `${r},${c}`;
      (pieceAt[key] ||= []).push({ color, id, pos: activePos, isMoving: isMovingThis });
    });
  });

  // ── RENDER ───────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col items-center select-none py-4 px-2 w-full">

      {/* ── HEADER: turn indicator + dice ─────────────────────────────────── */}
      <div className="w-full max-w-lg mb-4 flex items-center justify-between gap-3 px-2">
        <div className={`flex-1 flex items-center gap-3 px-4 py-3 rounded-2xl border transition-all duration-500 
          ${turn==='R'?'bg-red-500/20 border-red-500/40':turn==='G'?'bg-green-500/20 border-green-500/40':
            turn==='Y'?'bg-yellow-500/20 border-yellow-500/40':'bg-blue-500/20 border-blue-500/40'}`}>
          <div className="w-4 h-4 rounded-full flex-shrink-0" style={{ background: COLOR_META[turn].main }} />
          <span className="text-sm font-black text-white tracking-wide leading-tight">
            {winner
              ? `🏆 ${COLOR_META[winner].label} gagne !`
              : isAITurn
                ? `🤖 Système joue (${COLOR_META[turn].label})…`
                : isHumanTurn
                  ? rolled
                    ? validIds.length > 0 
                      ? `🎲 Résultat : ${dice} ! 👉 Clique sur un pion !` 
                      : `🎲 Résultat : ${dice} ! Aucun mouvement… → Passage`
                    : '🎲 Lance le dé !'
                  : `⏳ Tour de ${COLOR_META[turn].label}…`}
          </span>
          {/* My color badge for multiplayer */}
          {isMultiplayer && myColor && (
            <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border mt-0.5`}
              style={{ 
                color: myColor === 'R' ? '#f87171' : myColor === 'B' ? '#60a5fa' : myColor === 'G' ? '#4ade80' : '#facc15',
                borderColor: myColor === 'R' ? '#f87171' : myColor === 'B' ? '#60a5fa' : myColor === 'G' ? '#4ade80' : '#facc15',
                background: myColor === 'R' ? 'rgba(239,68,68,0.1)' : myColor === 'B' ? 'rgba(59,130,246,0.1)' : myColor === 'G' ? 'rgba(74,222,128,0.1)' : 'rgba(250,204,21,0.1)'
              }}
            >
              Vous : {myColor === 'R' ? 'Rouge' : myColor === 'B' ? 'Bleu' : myColor === 'G' ? 'Vert' : 'Jaune'}
            </span>
          )}
        </div>

        {/* Dice button */}
        <motion.button
          onClick={doRoll}
          disabled={!isHumanTurn || rolled || rolling || !!winner || isSpectator}
          initial={false}
          animate={
            rolling 
              ? { rotate: [0, 90, 180, 270, 360], scale: [1, 1.2, 1, 1.2, 1] } 
              : rolled 
                ? { scale: [1, 1.3, 1], transition: { type: 'spring', damping: 8 } }
                : { scale: 1 }
          }
          className={`w-20 h-20 rounded-2xl flex flex-col items-center justify-center
            bg-white shadow-[0_6px_0_#b0b0b0,0_12px_25px_rgba(0,0,0,0.4)]
            active:shadow-[0_1px_0_#b0b0b0] active:translate-y-1 transition-all border-2 border-white/30
            ${(!isHumanTurn||rolled||winner||isSpectator)?'opacity-60 grayscale-[0.5]':'cursor-pointer hover:brightness-110'}`}
        >
          <div className="text-4xl leading-none">
            {rolling ? '🎲' : (dice ? DICE_FACES[dice-1] : '🎲')}
          </div>
          {dice && !rolling && (
             <motion.div 
               initial={{ opacity: 0, y: 5 }}
               animate={{ opacity: 1, y: 0 }}
               className="text-[14px] font-black text-blue-900 mt-1 bg-blue-100 px-2 rounded-md"
             >
               {dice}
             </motion.div>
          )}
        </motion.button>
      </div>

      {/* ── BOARD ─────────────────────────────────────────────────────────── */}
      <motion.div
        animate={shakeBoard ? { x:[-4,4,-4,4,0], y:[-2,2,-2,2,0] } : {}}
        transition={{ duration:0.25 }}
        className="relative rounded-2xl overflow-hidden select-none"
        style={{
          width:  'min(95vw, 540px)',
          height: 'min(95vw, 540px)',
          border: '7px solid #c8860a',
          boxShadow: '0 25px 60px rgba(0,0,0,0.7), inset 0 0 40px rgba(0,0,0,0.2)',
          background: '#f5f0e8',
        }}
      >
        <div
          className="absolute inset-0 grid"
          style={{ gridTemplateColumns:'repeat(15,1fr)', gridTemplateRows:'repeat(15,1fr)' }}
        >
          {Array.from({ length: 225 }, (_, i) => {
            const r    = Math.floor(i / 15);
            const c    = i % 15;
            const type = getCellType(r, c);
            const key  = `${r},${c}`;
            const isSafe      = type === 'path' && SAFE.has(key);
            const isCapturing = captureKey === key;
            const cellPieces  = pieceAt[key] ?? [];
            const bg          = CELL_BG[type] ?? 'bg-white';

            return (
              <div
                key={i}
                className={`relative border-[0.5px] border-black/10 flex items-center justify-center overflow-hidden
                  ${bg}
                  ${isCapturing ? '!bg-yellow-200 animate-ping' : ''}`}
              >
                {/* Safe-zone star */}
                {isSafe && (
                  <svg viewBox="0 0 20 20" className="absolute inset-0 m-auto w-[70%] h-[70%] pointer-events-none">
                    <polygon
                      points="10,1 12.4,7.2 19,7.6 14,12.2 15.8,18.8 10,15.2 4.2,18.8 6,12.2 1,7.6 7.6,7.2"
                      fill="white" stroke="rgba(0,0,0,0.25)" strokeWidth="0.5"
                    />
                  </svg>
                )}

                {/* Directional arrows */}
                {type === 'r-home' && c === 1 && <span className="text-[8px] text-red-900 font-black z-10">➤</span>}
                {type === 'g-home' && r === 1 && <span className="text-[8px] text-green-900 font-black z-10">▼</span>}
                {type === 'y-home' && c === 13 && <span className="text-[8px] text-yellow-900 font-black z-10">◀</span>}
                {type === 'b-home' && r === 13 && <span className="text-[8px] text-blue-900 font-black z-10">▲</span>}

                {/* Center crown */}
                {type === 'center' && (
                  <div className="absolute inset-0 flex items-center justify-center z-30">
                    <div className="w-[80%] h-[80%] rounded-full bg-gradient-to-b from-yellow-200 to-yellow-500 shadow-xl border-2 border-yellow-100 flex items-center justify-center">
                      <span style={{ fontSize:'min(3vw,16px)' }}>👑</span>
                    </div>
                  </div>
                )}

                {/* Pieces */}
                {cellPieces.length > 0 && (
                  <div className={`absolute inset-[2%] z-20 gap-[1px]
                    ${cellPieces.length > 1 ? 'grid grid-cols-2 grid-rows-2' : 'flex items-center justify-center'}`}>
                    {cellPieces.map(({ color, id, isMoving }) => {
                      const canMove = isHumanTurn && rolled && turn === color && validIds.includes(id) && !isSpectator;
                      return (
                        <motion.div
                          key={`${color}-${id}`}
                          animate={isMoving ? { y:[-18,0], scale:[1.25,1] } : {}}
                          transition={{ duration:0.1 }}
                          className="w-full h-full"
                        >
                          <LudoPin color={color} canMove={canMove} onClick={() => canMove && doMove(id)} />
                        </motion.div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* ── Base inner rounded pads ── */}
        {[
          { style:{ top:'3%', left:'3%' },     className:'bg-red-500/30 rounded-[30%] border-4 border-red-400/40' },
          { style:{ top:'3%', right:'3%' },    className:'bg-green-500/30 rounded-[30%] border-4 border-green-400/40' },
          { style:{ bottom:'3%', right:'3%' }, className:'bg-yellow-500/30 rounded-[30%] border-4 border-yellow-400/40' },
          { style:{ bottom:'3%', left:'3%' },  className:'bg-blue-500/30 rounded-[30%] border-4 border-blue-400/40' },
        ].map((p, i) => (
          <div key={i} className={`absolute pointer-events-none shadow-inner ${p.className}`}
            style={{ ...p.style, width:'32%', height:'32%' }} />
        ))}

        {/* ── Center colored triangles ── */}
        <div className="absolute pointer-events-none flex items-center justify-center"
          style={{ top:'40%', left:'40%', width:'20%', height:'20%' }}>
          <div className="absolute inset-0 overflow-hidden">
            <div className="absolute inset-0 flex flex-wrap">
              <div className="w-1/2 h-1/2 border-r border-b border-white/30"
                style={{ background:'#ef4444', clipPath:'polygon(0 0,100% 0,0 100%)' }} />
              <div className="w-1/2 h-1/2 border-l border-b border-white/30"
                style={{ background:'#16a34a', clipPath:'polygon(0 0,100% 0,100% 100%)' }} />
              <div className="w-1/2 h-1/2 border-r border-t border-white/30"
                style={{ background:'#2563eb', clipPath:'polygon(0 0,0 100%,100% 100%)' }} />
              <div className="w-1/2 h-1/2 border-l border-t border-white/30"
                style={{ background:'#ca8a04', clipPath:'polygon(100% 0,100% 100%,0 100%)' }} />
            </div>
          </div>
        </div>
      </motion.div>

      {/* ── PLAYER CARDS ──────────────────────────────────────────────────── */}
      <div className="w-full max-w-lg mt-6 grid grid-cols-4 gap-2">
        {(Object.keys(ROLE_COLOR)).sort().map((role, idx) => {
          const color  = ROLE_COLOR[role];
          const meta   = COLOR_META[color];
          const active = turn === color;
          const done   = pieces[color].filter(p => p === 57).length;
          const isAI   = isAIMode && color !== myColor;
          return (
            <div key={color} className={`rounded-2xl p-3 border transition-all duration-400
              ${active
                ? `${BG_CLASS[color]} border-white/30 scale-105 shadow-xl`
                : 'bg-white/5 border-white/10 opacity-50 grayscale'}`}>
              <div className="text-[8px] font-black text-white/80 uppercase tracking-widest mb-2">
                {isAI ? '🤖' : role} · {meta.label}
              </div>
              <div className="flex gap-1 items-center">
                {pieces[color].map((p, i) => (
                  <div key={i} title={p === 57 ? 'Arrivé !' : p === -1 ? 'Base' : `case ${p}`}
                    className={`flex-1 h-1.5 rounded-full transition-all
                      ${p === 57 ? 'bg-green-400 shadow-[0_0_6px_#4ade80]'
                      : p >= 52  ? 'bg-white/80'
                      : p >= 0   ? 'bg-white/50'
                      :            'bg-black/30'}`}
                  />
                ))}
              </div>
              {done > 0 && (
                <div className="text-[9px] text-green-300 font-black mt-1">{done}/4 arrivés</div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default Ludo;
