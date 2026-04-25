import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useTranslation } from '@/hooks/useTranslation';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

const MotsCaches = ({ onSubmit, duelMode, gameData: propGameData, opponentMove, onMove, bothReady, isSpectator }) => {
  const { t, lang } = useTranslation();
  const [gameData, setGameData] = useState(propGameData || null);
  const [loading, setLoading] = useState(!propGameData);
  const [selectedCells, setSelectedCells] = useState([]);
  const [foundWords, setFoundWords] = useState([]); // Array of strings for compatibility
  const [wordOwnership, setWordOwnership] = useState({}); // { word: 'player1' | 'player2' }
  const [foundCells, setFoundCells] = useState(new Set()); // "row-col" -> "player1" | "player2"
  const [isDragging, setIsDragging] = useState(false);
  const [startCell, setStartCell] = useState(null);

  const isAI = duelMode?.config?.opponent === 'ia';
  const myRole = (isSpectator || !duelMode?.role) ? 'player1' : duelMode.role; // Spectators default to observing via player1 perspective
  const oppRole = myRole === 'player1' ? 'player2' : 'player1';
  const isDuel = !!duelMode?.matchId || isAI;

  useEffect(() => {
    if (propGameData) {
      setGameData(propGameData);
      setLoading(false);
    } else if (!gameData && !isDuel) {
      fetchGameData();
    }
  }, [propGameData, isDuel, gameData]);

  // Recover found words if joining as spectator
  useEffect(() => {
    if (duelMode?.found_words && gameData && foundWords.length === 0) {
      duelMode.found_words.forEach(move => {
        handleRemoteWordFound(move.word, move.cells, move.role);
      });
    }
  }, [duelMode?.found_words, gameData, foundWords.length]);

  useEffect(() => {
    if (gameData && foundWords.length === gameData.words.length) {
      const myScore = Object.values(wordOwnership).filter(owner => owner === myRole).length;
      const oppScore = Object.values(wordOwnership).filter(owner => owner !== myRole).length;
      setTimeout(() => onSubmit({ 
        words_found: myScore,
        opponent_score: oppScore,
        won: myScore > oppScore,
        details: wordOwnership
      }), 1500);
    }
  }, [foundWords, gameData, onSubmit, wordOwnership, myRole]);

  // Handle Opponent Moves
  useEffect(() => {
    if (opponentMove?.wordFound) {
      handleRemoteWordFound(opponentMove.wordFound, opponentMove.selectedCells, opponentMove.role || 'player2');
    }
  }, [opponentMove]);

  // AI Logic
  useEffect(() => {
    if (isAI && bothReady && gameData && !isSpectator) {
      const aiTimer = setInterval(() => {
        setFoundWords(currentFoundWords => {
          if (currentFoundWords.length >= gameData.words.length) {
            clearInterval(aiTimer);
            return currentFoundWords;
          }
          if (Math.random() > 0.7) { // 30% chance every 5s
            const remaining = gameData.words.filter(w => !currentFoundWords.includes(w));
            if (remaining.length > 0) {
              const word = remaining[Math.floor(Math.random() * remaining.length)];
              const placement = gameData.placements[word];
              if (placement) {
                const cells = getAICells(placement);
                // Call handleRemoteWordFound but we must do it outside setFoundWords to avoid side-effects in state updaters
                setTimeout(() => {
                    handleRemoteWordFound(word, cells, oppRole);
                    if (onMove) onMove({ wordFound: word, selectedCells: cells, role: oppRole });
                }, 0);
              }
            }
          }
          return currentFoundWords; // Return unchanged
        });
      }, 5000);
      return () => clearInterval(aiTimer);
    }
  }, [isAI, bothReady, gameData, isSpectator, oppRole]); // Removed foundWords from deps!

  const getAICells = (placement) => {
    const { start, direction, length } = placement;
    const cells = [];
    let r = start[0], c = start[1];
    const dr = direction === 'V' ? 1 : (direction === 'D' ? 1 : 0);
    const dc = direction === 'H' ? 1 : (direction === 'D' ? 1 : 0);
    for (let i = 0; i < length; i++) {
      cells.push([r, c]);
      r += dr;
      c += dc;
    }
    return cells;
  };

  const handleRemoteWordFound = useCallback((word, cells, owner) => {
    setFoundWords(prev => {
      if (prev.includes(word)) return prev;
      return [...prev, word];
    });
    setWordOwnership(prev => ({ ...prev, [word]: owner })); // Ensures object update triggers re-render
    setFoundCells(prev => {
      const next = new Set(prev);
      cells.forEach(([r, c]) => next.add(`${r}-${c}-${owner}`));
      return next;
    });
  }, []);

  const fetchGameData = async () => {
    try {
      const response = await axios.post(
        `${BACKEND_URL}/api/games/start`,
        { mode_id: 'mots_caches', lang },
        { withCredentials: true }
      );
      setGameData(response.data.game_data);
    } catch (error) {
      console.error('Erreur:', error);
    } finally {
      setLoading(false);
    }
  };

  const getCellsInLine = useCallback((start, end) => {
    if (!start || !end) return [];
    const dr = Math.sign(end[0] - start[0]);
    const dc = Math.sign(end[1] - start[1]);
    if (dr === 0 && dc === 0) return [start];
    if (dr !== 0 && dc !== 0 && Math.abs(end[0] - start[0]) !== Math.abs(end[1] - start[1])) return [];
    
    const cells = [];
    let r = start[0], c = start[1];
    const len = Math.max(Math.abs(end[0] - start[0]), Math.abs(end[1] - start[1]));
    for (let i = 0; i <= len; i++) {
      cells.push([r, c]);
      r += dr;
      c += dc;
    }
    return cells;
  }, []);

  const handleMouseDown = (row, col) => {
    if (loading || isSpectator) return;
    setIsDragging(true);
    setStartCell([row, col]);
    setSelectedCells([[row, col]]);
  };

  const handleMouseEnter = (row, col) => {
    if (!isDragging || !startCell) return;
    const cells = getCellsInLine(startCell, [row, col]);
    if (cells.length > 0) setSelectedCells(cells);
  };

  const handleMouseUp = () => {
    if (!isDragging || !gameData) { setIsDragging(false); return; }
    setIsDragging(false);

    const selectedWord = selectedCells.map(([r, c]) => gameData.grid[r][c]).join('');
    const reversedWord = selectedWord.split('').reverse().join('');

    const match = gameData.words.find(
      w => !foundWords.includes(w) && (w === selectedWord || w === reversedWord)
    );

    if (match) {
      setFoundWords(prev => [...prev, match]);
      setWordOwnership(prev => ({ ...prev, [match]: myRole }));
      setFoundCells(prev => {
        const next = new Set(prev);
        selectedCells.forEach(([r, c]) => next.add(`${r}-${c}-${myRole}`));
        return next;
      });
      
      // Sync move
      if (onMove) {
        onMove({ wordFound: match, selectedCells, role: myRole });
      }
    }
    setSelectedCells([]);
    setStartCell(null);
  };

  const handleTouchMove = (e) => {
    if (!isDragging || !startCell) return;
    
    // Prevent scrolling while selecting words
    if (e.cancelable) e.preventDefault();

    const touch = e.touches[0];
    const target = document.elementFromPoint(touch.clientX, touch.clientY);
    
    // Use closest to find the cell if touch is slightly off
    const cell = target?.closest('[data-cell]');
    if (cell) {
      const r = parseInt(cell.getAttribute('data-row'));
      const c = parseInt(cell.getAttribute('data-col'));
      handleMouseEnter(r, c);
    }
  };

  if (loading || !gameData) {
    return <div className="text-center text-white">{t('mots_caches.loading')}</div>;
  }

  const isSelected = (r, c) => selectedCells.some(([sr, sc]) => sr === r && sc === c);
  const getCellOwner = (r, c) => {
    if (foundCells.has(`${r}-${c}-${myRole}`)) return myRole;
    if (foundCells.has(`${r}-${c}-${oppRole}`)) return oppRole;
    return null;
  };

  return (
    <div className="max-w-3xl mx-auto select-none space-y-6" data-testid="mots-caches-game">
      {/* Header Scoring with Progress Bar */}
      <div className="relative bg-white/5 backdrop-blur-xl p-5 rounded-3xl border border-white/10 shadow-2xl overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 to-purple-500/5 pointer-events-none" />
        
        <div className="flex justify-between items-center relative z-10 mb-4">
          <div className="flex flex-col items-start">
            <span className={`text-[10px] font-black uppercase tracking-widest mb-1 text-blue-400`}>
              {isSpectator ? 'Joueur 1' : (isDuel ? t('duo.you') : t('mots_caches.words_found'))}
            </span>
            <div className="flex items-baseline gap-2">
              <span className={`text-4xl font-black text-white drop-shadow-[0_0_15px_rgba(59,130,246,0.5)]`}>
                {Object.values(wordOwnership).filter(o => o === myRole).length}
              </span>
              <span className="text-white/30 font-bold text-[10px] uppercase">mots</span>
            </div>
          </div>
          
          <div className="flex flex-col items-center">
            <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mb-1 shadow-inner">
              <span className="text-xl">🔤</span>
            </div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">
              {foundWords.length} / {gameData.words.length}
            </span>
          </div>

          {isDuel ? (
            <div className="flex flex-col items-end">
              <span className={`text-[10px] font-black uppercase tracking-widest mb-1 text-red-400`}>
                {isSpectator ? 'Joueur 2' : (isAI ? 'SYSTEM' : t('duo.opponent'))}
              </span>
              <div className="flex items-baseline gap-2">
                <span className="text-white/30 font-bold text-[10px] uppercase">mots</span>
                <span className={`text-4xl font-black text-white drop-shadow-[0_0_15px_rgba(239,68,68,0.5)]`}>
                  {Object.values(wordOwnership).filter(o => o === oppRole).length}
                </span>
              </div>
            </div>
          ) : (
             <div className="w-20" /> // Spacer
          )}
        </div>

        {/* Global Progress Bar */}
        <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden border border-white/5 flex relative">
            <motion.div 
              className="absolute left-0 top-0 bottom-0 bg-gradient-to-r from-blue-600 to-blue-400 shadow-[0_0_15px_rgba(59,130,246,0.5)] rounded-full transition-all duration-500 z-10"
              animate={{ width: `${(Object.values(wordOwnership).filter(o => o === myRole).length / gameData.words.length) * 100}%` }}
            />
            {isDuel && (
              <motion.div 
                className="absolute right-0 top-0 bottom-0 bg-gradient-to-l from-red-600 to-red-400 shadow-[0_0_15px_rgba(239,68,68,0.5)] rounded-full transition-all duration-500 z-10"
                animate={{ width: `${(Object.values(wordOwnership).filter(o => o === oppRole).length / gameData.words.length) * 100}%` }}
              />
            )}
        </div>
      </div>

      <Card className="p-3 sm:p-5 bg-white/5 backdrop-blur-2xl border-white/10 shadow-[0_32px_64px_-12px_rgba(0,0,0,0.5)] relative overflow-hidden rounded-[2.5rem]">
        {/* Glow Spheres */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 blur-[100px] rounded-full -mr-32 -mt-32 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-purple-500/10 blur-[100px] rounded-full -ml-32 -mb-32 pointer-events-none" />

        <div
          className="grid gap-1.5 mx-auto relative z-10 p-2 sm:p-4 bg-black/20 rounded-[1.8rem] border border-white/5 shadow-inner touch-none"
          style={{ gridTemplateColumns: `repeat(${gameData.grid_size}, 1fr)`, maxWidth: '480px' }}
          onMouseLeave={() => { if (isDragging) handleMouseUp(); }}
          onTouchMove={handleTouchMove}
        >
          {gameData.grid.map((row, ri) =>
            row.map((letter, ci) => {
              const owner = getCellOwner(ri, ci);
              const selected = isSelected(ri, ci);
              
              return (
                <motion.div
                  key={`${ri}-${ci}`}
                  data-cell
                  data-row={ri}
                  data-col={ci}
                  onMouseDown={() => !owner && handleMouseDown(ri, ci)}
                  onMouseEnter={() => !owner && handleMouseEnter(ri, ci)}
                  onMouseUp={handleMouseUp}
                  onTouchStart={(e) => {
                    if (!owner) {
                      e.preventDefault();
                      handleMouseDown(ri, ci);
                    }
                  }}
                  onTouchEnd={(e) => {
                    e.preventDefault();
                    handleMouseUp();
                  }}
                  whileHover={!owner ? { scale: 1.05, backgroundColor: 'rgba(255,255,255,0.1)' } : {}}
                  transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                  className={`aspect-square flex items-center justify-center text-xs sm:text-lg font-black cursor-pointer rounded-xl transition-all duration-300
                    ${owner === myRole ? 'bg-gradient-to-br from-blue-500 to-blue-700 text-white shadow-[0_8px_16px_rgba(37,99,235,0.4)] ring-2 ring-white/20' 
                      : owner === oppRole ? 'bg-gradient-to-br from-red-500 to-red-700 text-white shadow-[0_8px_16px_rgba(220,38,38,0.4)] ring-2 ring-white/20' 
                      : selected ? 'bg-gradient-to-br from-yellow-300 to-yellow-500 text-blue-900 shadow-[0_0_20px_rgba(234,179,8,0.6)] scale-110 z-20 border-2 border-white' 
                      : 'text-white/60 hover:text-white border border-white/[0.03] bg-white/[0.02]'}`}
                >
                  <span className={owner || selected ? 'scale-110' : ''}>{letter}</span>
                </motion.div>
              );
            })
          )}
        </div>
      </Card>

      {/* Word List Area */}
      <div className="bg-white/[0.03] backdrop-blur-md border border-white/10 p-6 rounded-[2rem] shadow-xl">
        <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] text-center mb-5">
           {t('mots_caches.words_to_find') || 'LEXIQUE BIBLIQUE'}
        </h3>
        <div className="flex flex-wrap gap-2.5 justify-center">
          {gameData.words.map((word) => {
            const owner = wordOwnership[word];
            return (
              <motion.div
                key={word}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                layout
                className={`px-4 py-2 rounded-2xl text-[10px] font-black uppercase tracking-wider transition-all duration-500 border-2 flex items-center gap-2.5 ${owner ? (owner === myRole ? 'bg-blue-500/20 border-blue-500 text-blue-300 shadow-[0_0_20px_rgba(59,130,246,0.3)] line-through' : 'bg-red-500/20 border-red-500 text-red-300 shadow-[0_0_20px_rgba(239,68,68,0.3)] line-through') : 'bg-white/5 border-white/5 text-white/30'}`}
              >
                {owner === myRole ? (
                   <motion.div initial={{scale:0}} animate={{scale:1}} className="w-2.5 h-2.5 rounded-full bg-blue-400 shadow-[0_0_12px_#3b82f6]" />
                ) : owner === oppRole ? (
                   <motion.div initial={{scale:0}} animate={{scale:1}} className="w-2.5 h-2.5 rounded-full bg-red-400 shadow-[0_0_12px_#ef4444]" />
                ) : (
                   <div className="w-2 h-2 rounded-full bg-white/10" />
                )}
                <span className={owner ? 'opacity-100' : 'opacity-50'}>{word}</span>
                {owner && (
                  <motion.span 
                    initial={{ scale: 0, rotate: -45 }} 
                    animate={{ scale: 1, rotate: 0 }} 
                    className={`ml-1 text-xs font-bold ${owner === myRole ? 'text-blue-300' : 'text-red-300'}`}
                  >
                    {owner === myRole ? t('duo.you_short') || 'MOI' : t('duo.opp_short') || 'LUI'}
                  </motion.span>
                )}
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default MotsCaches;
