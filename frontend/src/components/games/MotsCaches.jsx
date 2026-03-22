import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

const MotsCaches = ({ onSubmit }) => {
  const [gameData, setGameData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedCells, setSelectedCells] = useState([]);
  const [foundWords, setFoundWords] = useState([]);
  const [foundCells, setFoundCells] = useState(new Set());
  const [isDragging, setIsDragging] = useState(false);
  const [startCell, setStartCell] = useState(null);

  useEffect(() => {
    fetchGameData();
  }, []);

  useEffect(() => {
    if (gameData && foundWords.length === gameData.words.length) {
      setTimeout(() => onSubmit({ words_found: foundWords.length }), 1500);
    }
  }, [foundWords, gameData, onSubmit]);

  const fetchGameData = async () => {
    try {
      const response = await axios.post(
        `${BACKEND_URL}/api/games/start`,
        { mode_id: 'mots_caches' },
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
      const newFound = new Set(foundCells);
      selectedCells.forEach(([r, c]) => newFound.add(`${r}-${c}`));
      setFoundCells(newFound);
    }
    setSelectedCells([]);
    setStartCell(null);
  };

  if (loading || !gameData) {
    return <div className="text-center text-white">Chargement de la grille...</div>;
  }

  const isSelected = (r, c) => selectedCells.some(([sr, sc]) => sr === r && sc === c);
  const isFound = (r, c) => foundCells.has(`${r}-${c}`);

  return (
    <div className="max-w-3xl mx-auto select-none" data-testid="mots-caches-game">
      <div className="mb-6 text-center">
        <span className="text-yellow-400 font-semibold text-lg">
          Mots trouvés : {foundWords.length}/{gameData.words.length}
        </span>
      </div>

      <Card className="p-4 sm:p-6 bg-white/10 backdrop-blur-md border-white/20 mb-6">
        <div
          className="grid gap-0.5 mx-auto"
          style={{ gridTemplateColumns: `repeat(${gameData.grid_size}, 1fr)`, maxWidth: '500px' }}
          onMouseLeave={() => { if (isDragging) handleMouseUp(); }}
        >
          {gameData.grid.map((row, ri) =>
            row.map((letter, ci) => (
              <motion.div
                key={`${ri}-${ci}`}
                data-testid={`cell-${ri}-${ci}`}
                onMouseDown={() => handleMouseDown(ri, ci)}
                onMouseEnter={() => handleMouseEnter(ri, ci)}
                onMouseUp={handleMouseUp}
                onTouchStart={() => handleMouseDown(ri, ci)}
                onTouchEnd={handleMouseUp}
                whileHover={{ scale: 1.1 }}
                className={`aspect-square flex items-center justify-center text-sm sm:text-base font-bold cursor-pointer rounded-sm transition-colors
                  ${isFound(ri, ci) ? 'bg-emerald-500/60 text-white' 
                    : isSelected(ri, ci) ? 'bg-yellow-400/50 text-white' 
                    : 'bg-white/5 text-blue-100 hover:bg-white/15'}`}
              >
                {letter}
              </motion.div>
            ))
          )}
        </div>
      </Card>

      <div className="flex flex-wrap gap-3 justify-center">
        {gameData.words.map((word) => (
          <motion.span
            key={word}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`px-4 py-2 rounded-full text-sm font-semibold transition-all
              ${foundWords.includes(word)
                ? 'bg-emerald-500/30 text-emerald-300 line-through'
                : 'bg-white/10 text-white'}`}
          >
            {word}
          </motion.span>
        ))}
      </div>
    </div>
  );
};

export default MotsCaches;
