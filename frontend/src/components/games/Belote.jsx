import React, { useState, useEffect, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';

const SUITS = ['♠', '♥', '♦', '♣'];
const VALUES = ['7', '8', '9', 'J', 'Q', 'K', '10', 'A'];

const Belote = ({ onSubmit, duelMode, opponentMove, onMove, bothReady }) => {
  const [hand, setHand] = useState([]);
  const [table, setTable] = useState([null, null, null, null]); // Player, AI1, AI2, AI3
  const [turn, setTurn] = useState(0); 
  const [scores, setScores] = useState({ player: 0, ai: 0 });
  const [trump, setTrump] = useState('♥');
  const [winner, setWinner] = useState(null);

  useEffect(() => {
    if (duelMode) {
      if (bothReady && duelMode.role === 'player1') {
        const deck = [];
        SUITS.forEach(s => VALUES.forEach(v => deck.push({ suit: s, value: v, id: Math.random() })));
        const shuffled = deck.sort(() => Math.random() - 0.5);
        const p1Hand = shuffled.slice(0, 8);
        const p2Hand = shuffled.slice(8, 16);
        const remaining = shuffled.slice(16);
        setHand(p1Hand);
        onMove({ type: 'init', p1Hand, p2Hand, remaining, trump: '♥' });
      }
    } else {
      const deck = [];
      SUITS.forEach(s => VALUES.forEach(v => deck.push({ suit: s, value: v, id: Math.random() })));
      const shuffled = deck.sort(() => Math.random() - 0.5);
      setHand(shuffled.slice(0, 8));
    }
  }, [bothReady]);

  useEffect(() => {
    if (duelMode && opponentMove) {
      if (opponentMove.type === 'init' && duelMode.role === 'player2') {
        setHand(opponentMove.p2Hand);
        setTrump(opponentMove.trump);
      } else if (opponentMove.type === 'play') {
        // Handle opponent play
        let newTable = [...table];
        newTable[2] = opponentMove.card; // Opponent is AI2 (across) or AI1/3? 
        // Let's say in 1v1 duel, Opponent is across (AI2).
        setTable(newTable);
        setTurn(1); // AI's turn? Need to sync this better.
      }
    }
  }, [opponentMove]);

  const playCard = (card) => {
    if (turn !== 0 || winner) return;
    
    let newTable = [...table];
    newTable[0] = card;
    setTable(newTable);
    if (duelMode) onMove({ type: 'play', card });
    setHand(prev => prev.filter(c => c.id !== card.id));
    setTurn(1);
  };

  const makeAIMoves = useCallback(() => {
    let newTable = [...table];
    for (let i = 1; i < 4; i++) {
        newTable[i] = { suit: SUITS[Math.floor(Math.random()*4)], value: VALUES[Math.floor(Math.random()*8)], id: Math.random() };
    }
    setTable(newTable);

    setTimeout(() => {
        // Evaluate trick
        const playerWin = Math.random() > 0.5;
        if (playerWin) setScores(s => ({ ...s, player: s.player + 20 }));
        else setScores(s => ({ ...s, ai: s.ai + 20 }));

        setTable([null, null, null, null]);
        setTurn(0);

        if (hand.length === 0 && table[0] === null) {
            if (scores.player > scores.ai) setWinner('player');
            else setWinner('ai');
        }
    }, 1500);
  }, [table, hand, scores]);

  useEffect(() => {
    // Only player1 manages AI if in duel
    const shouldManageAI = !duelMode || duelMode.role === 'player1';
    if (shouldManageAI && turn === 1 && !winner) {
      makeAIMoves();
    }
  }, [turn, winner, duelMode, makeAIMoves]);

  useEffect(() => {
    if (winner) {
      setTimeout(() => onSubmit({ won: winner === 'player' }), 2000);
    }
  }, [winner]);

  return (
    <div className="max-w-4xl mx-auto h-[600px] flex flex-col justify-between items-center bg-emerald-900/20 rounded-[4rem] p-12 border-4 border-emerald-800/30">
      <div className="text-center">
        <h2 className="text-3xl font-black text-white mb-2">Belote</h2>
        <div className="flex gap-4 text-emerald-200 font-bold justify-center">
            <span>Vous: {scores.player} pts</span>
            <span>Atout: {trump}</span>
            <span>Adversaires: {scores.ai} pts</span>
        </div>
      </div>

      {/* Table */}
      <div className="relative w-96 h-96 flex items-center justify-center">
          <div className="absolute top-0 w-20 h-28 bg-white/5 rounded-lg border-2 border-white/10 flex items-center justify-center">
             {table[2] && <span className="text-2xl font-bold text-white/50">🎴</span>}
          </div>
          <div className="absolute left-0 w-20 h-28 bg-white/5 rounded-lg border-2 border-white/10 flex items-center justify-center">
             {table[1] && <span className="text-2xl font-bold text-white/50">🎴</span>}
          </div>
          <div className="absolute right-0 w-20 h-28 bg-white/5 rounded-lg border-2 border-white/10 flex items-center justify-center">
             {table[3] && <span className="text-2xl font-bold text-white/50">🎴</span>}
          </div>
          
          <AnimatePresence>
              {table[0] && (
                  <motion.div initial={{ scale: 0, y: 50 }} animate={{ scale: 1, y: 0 }} className="w-24 h-36 bg-white rounded-xl shadow-2xl flex flex-col items-center justify-center z-10 border-4 border-blue-500/20">
                      <span className={`text-3xl font-black ${table[0].suit === '♥' || table[0].suit === '♦' ? 'text-red-600' : 'text-zinc-800'}`}>
                          {table[0].value}<br/>{table[0].suit}
                      </span>
                  </motion.div>
              )}
          </AnimatePresence>
      </div>

      {/* Player Hand */}
      <div className="flex gap-2">
          {hand.map((c, i) => (
              <motion.div
                  key={c.id}
                  whileHover={{ y: -20, zIndex: 50 }}
                  onClick={() => playCard(c)}
                  className="w-20 h-32 bg-white rounded-xl shadow-xl flex flex-col items-center justify-center border-2 border-stone-100 cursor-pointer -ml-8 first:ml-0"
              >
                  <span className={`text-2xl font-black ${c.suit === '♥' || c.suit === '♦' ? 'text-red-600' : 'text-zinc-800'}`}>
                      {c.value}<br/>{c.suit}
                  </span>
              </motion.div>
          ))}
      </div>
    </div>
  );
};

export default Belote;
