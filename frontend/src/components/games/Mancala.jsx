import React, { useState, useEffect, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';

const Mancala = ({ onSubmit, duelMode, opponentMove, onMove, bothReady }) => {
  const [pits, setPits] = useState([4, 4, 4, 4, 4, 4, 0, 4, 4, 4, 4, 4, 4, 0]);
  const [turn, setTurn] = useState(0); // 0 for Player, 1 for AI/Opponent
  const [winner, setWinner] = useState(null);

  const PLAYER_PITS = [0, 1, 2, 3, 4, 5];
  const PLAYER_STORE = 6;
  const AI_PITS = [7, 8, 9, 10, 11, 12];
  const AI_STORE = 13;

  const moveSeeds = (pitIndex) => {
    let newPits = [...pits];
    let seeds = newPits[pitIndex];
    if (seeds === 0) return;
    newPits[pitIndex] = 0;

    let curr = pitIndex;
    const currentTurn = turn;
    
    while (seeds > 0) {
      curr = (curr + 1) % 14;
      if (currentTurn === 0 && curr === AI_STORE) continue;
      if (currentTurn === 1 && curr === PLAYER_STORE) continue;

      newPits[curr]++;
      seeds--;
    }

    if (currentTurn === 0 && curr === PLAYER_STORE) {
        setTurn(0);
    } else if (currentTurn === 1 && curr === AI_STORE) {
        setTurn(1);
    } else {
        if (currentTurn === 0 && PLAYER_PITS.includes(curr) && newPits[curr] === 1) {
            const opposite = 12 - curr;
            if (newPits[opposite] > 0) {
                newPits[PLAYER_STORE] += newPits[opposite] + 1;
                newPits[curr] = 0;
                newPits[opposite] = 0;
            }
        } else if (currentTurn === 1 && AI_PITS.includes(curr) && newPits[curr] === 1) {
            const opposite = 12 - curr;
            if (newPits[opposite] > 0) {
                newPits[AI_STORE] += newPits[opposite] + 1;
                newPits[curr] = 0;
                newPits[opposite] = 0;
            }
        }
        setTurn(currentTurn === 0 ? 1 : 0);
    }

    setPits(newPits);
    checkEnd(newPits);
  };

  const handlePitClick = (i) => {
    const isMyTurn = !duelMode || (bothReady && (duelMode.role === 'player1' ? turn === 0 : turn === 1));
    if (!isMyTurn || winner !== null) return;
    if (turn === 0 && !PLAYER_PITS.includes(i)) return;
    if (turn === 1 && !AI_PITS.includes(i)) return;
    if (pits[i] === 0) return;

    if (duelMode) onMove({ type: 'move', pitIndex: i });
    moveSeeds(i);
  };

  const checkEnd = (p) => {
    const playerEmpty = PLAYER_PITS.every(i => p[i] === 0);
    const aiEmpty = AI_PITS.every(i => p[i] === 0);

    if (playerEmpty || aiEmpty) {
      let finalPits = [...p];
      PLAYER_PITS.forEach(i => { finalPits[PLAYER_STORE] += finalPits[i]; finalPits[i] = 0; });
      AI_PITS.forEach(i => { finalPits[AI_STORE] += finalPits[i]; finalPits[i] = 0; });
      setPits(finalPits);
      
      if (finalPits[PLAYER_STORE] > finalPits[AI_STORE]) setWinner(0);
      else if (finalPits[AI_STORE] > finalPits[PLAYER_STORE]) setWinner(1);
      else setWinner('T');
    }
  };

  useEffect(() => {
    if (winner !== null) {
        const myTurnIndex = duelMode ? (duelMode.role === 'player1' ? 0 : 1) : 0;
        setTimeout(() => onSubmit({ won: winner === myTurnIndex }), 2000);
    }
  }, [winner, onSubmit, duelMode]);

  const makeAIMove = useCallback(() => {
    const availablePits = AI_PITS.filter(i => pits[i] > 0);
    if (availablePits.length === 0) return;
    let bestMove = availablePits[Math.floor(Math.random() * availablePits.length)];
    moveSeeds(bestMove);
  }, [pits, turn]);

  useEffect(() => {
    if (!duelMode && turn === 1 && winner === null) {
      const timer = setTimeout(makeAIMove, 1000);
      return () => clearTimeout(timer);
    }
  }, [turn, winner, makeAIMove, duelMode]);

  useEffect(() => {
    if (duelMode && opponentMove && opponentMove.type === 'move') {
      const { pitIndex } = opponentMove;
      moveSeeds(pitIndex);
    }
  }, [opponentMove]);

  return (
    <div className="max-w-4xl mx-auto">
      <div className="text-center mb-12">
        <h2 className="text-4xl font-black text-white mb-2">Awalé</h2>
        <p className="text-blue-200">
          {winner !== null ? (
            winner === 'T' ? "Égalité !" : 
            duelMode ? (winner === (duelMode.role === 'player1' ? 0 : 1) ? "Victoire !" : "Défaite !") :
            (winner === 0 ? "Victoire !" : "L'IA a gagné !")
          ) : (
            duelMode ? (
                (turn === (duelMode.role === 'player1' ? 0 : 1)) ? "À vous" : "Attente de l'adversaire..."
            ) : (
                turn === 0 ? "À vous" : "L'IA joue..."
            )
          )}
        </p>
      </div>

      <div className="relative bg-orange-950 p-8 rounded-[3rem] shadow-2xl border-8 border-orange-900">
        <div className="grid grid-cols-8 gap-4">
          <div className="col-span-1 row-span-2 bg-orange-900/50 rounded-full flex flex-col items-center justify-center p-4">
            <span className="text-white font-bold mb-4">{pits[AI_STORE]}</span>
            <div className="flex flex-wrap gap-1 justify-center">
              {Array(pits[AI_STORE]).fill(0).map((_, i) => <div key={i} className="w-2 h-2 bg-amber-200 rounded-full shadow-inner" />)}
            </div>
          </div>

          <div className="col-span-6 grid grid-cols-6 gap-4">
            {[12, 11, 10, 9, 8, 7].map(i => (
              <div key={i} className="bg-orange-900/30 aspect-square rounded-full flex items-center justify-center relative">
                <span className="absolute -top-6 text-orange-200/50 font-bold">{pits[i]}</span>
                <div className="flex flex-wrap gap-1 justify-center p-2">
                  {Array(pits[i]).fill(0).map((_, idx) => <motion.div layout key={idx} className="w-2 h-2 bg-amber-100 rounded-full" />)}
                </div>
              </div>
            ))}
          </div>

          <div className="col-start-8 col-span-1 row-span-2 bg-orange-900/50 rounded-full flex flex-col items-center justify-center p-4">
            <span className="text-white font-bold mb-4">{pits[PLAYER_STORE]}</span>
            <div className="flex flex-wrap gap-1 justify-center">
              {Array(pits[PLAYER_STORE]).fill(0).map((_, i) => <div key={i} className="w-2 h-2 bg-amber-200 rounded-full shadow-inner" />)}
            </div>
          </div>

          <div className="col-start-2 col-span-6 grid grid-cols-6 gap-4">
            {[0, 1, 2, 3, 4, 5].map(i => (
              <div 
                key={i} 
                onClick={() => handlePitClick(i)}
                className={`aspect-square rounded-full flex items-center justify-center relative transition-colors cursor-pointer
                  ${((duelMode ? (turn === (duelMode.role === 'player1' ? 0 : 1)) : turn === 0)) && pits[i] > 0 ? 'bg-orange-800/80 hover:bg-orange-700' : 'bg-orange-900/30'}`}
              >
                <span className="absolute -bottom-6 text-orange-200/50 font-bold">{pits[i]}</span>
                <div className="flex flex-wrap gap-1 justify-center p-2">
                  {Array(pits[i]).fill(0).map((_, idx) => <motion.div layout key={idx} className="w-2 h-2 bg-amber-50 rounded-full" />)}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Mancala;
