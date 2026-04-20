import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';

const SUITS = ['♠', '♥', '♦', '♣'];
const VALUES = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];

const Bataille = ({ onSubmit, duelMode, opponentMove, onMove, bothReady }) => {
  const [playerDeck, setPlayerDeck] = useState([]);
  const [aiDeck, setAiDeck] = useState([]);
  const [currentCards, setCurrentCards] = useState({ p: null, a: null });
  const [winner, setWinner] = useState(null);

  useEffect(() => {
    if (duelMode) {
      if (bothReady && duelMode.role === 'player1') {
        const fullDeck = [];
        SUITS.forEach(s => VALUES.forEach(v => fullDeck.push({ suit: s, value: v, val: VALUES.indexOf(v) })));
        const shuffled = fullDeck.sort(() => Math.random() - 0.5);
        const pDeck = shuffled.slice(0, 26);
        const aDeck = shuffled.slice(26, 52);
        setPlayerDeck(pDeck);
        setAiDeck(aDeck);
        onMove({ type: 'init', pDeck, aDeck });
      }
    } else {
      const fullDeck = [];
      SUITS.forEach(s => VALUES.forEach(v => fullDeck.push({ suit: s, value: v, val: VALUES.indexOf(v) })));
      const shuffled = fullDeck.sort(() => Math.random() - 0.5);
      setPlayerDeck(shuffled.slice(0, 26));
      setAiDeck(shuffled.slice(26, 52));
    }
  }, [bothReady]);

  useEffect(() => {
    if (duelMode && opponentMove) {
      if (opponentMove.type === 'init' && duelMode.role === 'player2') {
        setPlayerDeck(opponentMove.aDeck);
        setAiDeck(opponentMove.pDeck);
      } else if (opponentMove.type === 'play') {
        playTurn(true);
      }
    }
  }, [opponentMove]);

  const playTurn = (isRemote = false) => {
    if (playerDeck.length === 0 || aiDeck.length === 0) return;
    if (duelMode && !isRemote) {
        onMove({ type: 'play' });
    }

    const pCard = playerDeck[0];
    const aCard = aiDeck[0];
    setCurrentCards({ p: pCard, a: aCard });

    setTimeout(() => {
      let pNew = playerDeck.slice(1);
      let aNew = aiDeck.slice(1);

      if (pCard.val > aCard.val) {
        pNew = [...pNew, pCard, aCard];
      } else if (aCard.val > pCard.val) {
        aNew = [...aNew, aCard, pCard];
      } else {
        pNew = [...pNew, pCard];
        aNew = [...aNew, aCard];
      }

      setPlayerDeck(pNew);
      setAiDeck(aNew);
      setCurrentCards({ p: null, a: null });

      if (pNew.length === 0) setWinner('ai');
      if (aNew.length === 0) setWinner('player');
    }, 1000);
  };

  useEffect(() => {
    if (winner) {
      setTimeout(() => onSubmit({ won: winner === 'player' }), 1500);
    }
  }, [winner]);

  return (
    <div className="max-w-md mx-auto text-center">
      <h2 className="text-3xl font-black text-white mb-8">Bataille</h2>
      
      <div className="flex justify-between items-center mb-12">
        <div>
            <p className="text-blue-300 mb-2">{duelMode ? 'Adversaire' : 'IA'} ({aiDeck.length})</p>
            <div className="w-24 h-36 bg-zinc-800 rounded-xl border-4 border-zinc-700 shadow-2xl flex items-center justify-center">
                <span className="text-zinc-600 text-4xl">🎴</span>
            </div>
        </div>

        <div className="flex-grow flex justify-center gap-4">
            <AnimatePresence>
                {currentCards.a && (
                    <motion.div initial={{ y: -50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ scale: 0 }} className="w-20 h-32 bg-white rounded-lg shadow-xl flex items-center justify-center text-2xl font-bold">
                        {currentCards.a.value}{currentCards.a.suit}
                    </motion.div>
                )}
                {currentCards.p && (
                    <motion.div initial={{ y: 50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ scale: 0 }} className="w-20 h-32 bg-white rounded-lg shadow-xl flex items-center justify-center text-2xl font-bold">
                        {currentCards.p.value}{currentCards.p.suit}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>

        <div>
            <p className="text-blue-300 mb-2">Vous ({playerDeck.length})</p>
            <div className="w-24 h-36 bg-zinc-800 rounded-xl border-4 border-zinc-700 shadow-2xl flex items-center justify-center">
                <span className="text-zinc-600 text-4xl">🎴</span>
            </div>
        </div>
      </div>

      <Button onClick={playTurn} disabled={!!currentCards.p || !!winner} className="w-full h-16 text-xl font-black bg-blue-600 hover:bg-blue-700 rounded-2xl">
        Jouer une carte
      </Button>

      {winner && (
        <div className="mt-8 text-2xl font-bold text-yellow-400">
            {winner === 'player' ? 'Gagné !' : 'Perdu !'}
        </div>
      )}
    </div>
  );
};

export default Bataille;
