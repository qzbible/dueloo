import React, { useState, useEffect, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';

const SUITS = ['♠', '♥', '♦', '♣'];
const VALUES = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];

const Poker = ({ onSubmit }) => {
  const [playerHand, setPlayerHand] = useState([]);
  const [aiHand, setAiHand] = useState([]);
  const [communityCards, setCommunityCards] = useState([]);
  const [deck, setDeck] = useState([]);
  const [phase, setPhase] = useState('bet'); // bet, flop, turn, river, showdown
  const [pot, setPot] = useState(0);
  const [playerChips, setPlayerChips] = useState(1000);
  const [aiChips, setAiChips] = useState(1000);
  const [winner, setWinner] = useState(null);

  function generateDeck() {
    let d = [];
    SUITS.forEach(s => VALUES.forEach(v => d.push({ suit: s, value: v, id: Math.random() })));
    return d.sort(() => Math.random() - 0.5);
  }

  useEffect(() => {
    const d = generateDeck();
    setPlayerHand(d.splice(0, 2));
    setAiHand(d.splice(0, 2));
    setDeck(d);
  }, []);

  const getHandRank = (hand, comm) => {
    const all = [...hand, ...comm];
    // Very simplified: High card = value, Pair = value + 100, etc.
    const counts = {};
    all.forEach(c => counts[c.value] = (counts[c.value] || 0) + 1);
    const maxCount = Math.max(...Object.values(counts));
    let score = VALUES.indexOf(all[0].value);
    if (maxCount === 2) score += 100;
    if (maxCount === 3) score += 200;
    if (maxCount === 4) score += 400;
    return score;
  };

  const nextPhase = () => {
    let d = [...deck];
    if (phase === 'bet') {
      setCommunityCards(d.splice(0, 3));
      setPhase('flop');
    } else if (phase === 'flop') {
      setCommunityCards(prev => [...prev, d.splice(0, 1)[0]]);
      setPhase('turn');
    } else if (phase === 'turn') {
      setCommunityCards(prev => [...prev, d.splice(0, 1)[0]]);
      setPhase('river');
    } else {
      showdown();
    }
    setDeck(d);
  };

  const showdown = () => {
    setPhase('showdown');
    const pScore = getHandRank(playerHand, communityCards);
    const aScore = getHandRank(aiHand, communityCards);
    if (pScore > aScore) setWinner('player');
    else if (aScore > pScore) setWinner('ai');
    else setWinner('tie');
  };

  useEffect(() => {
    if (winner) {
      setTimeout(() => onSubmit({ won: winner === 'player' }), 3000);
    }
  }, [winner]);

  return (
    <div className="max-w-4xl mx-auto">
      <div className="text-center mb-8">
        <h2 className="text-4xl font-black text-white mb-2">Poker (Duel)</h2>
        <p className="text-blue-200">Phase: {phase.toUpperCase()} | Pot: {pot} 🪙</p>
      </div>

      <div className="flex flex-col gap-12 items-center">
        {/* AI Area */}
        <div className="text-center">
            <p className="text-zinc-400 mb-2">IA ({aiChips} 🪙)</p>
            <div className="flex gap-4">
            {aiHand.map((_, i) => (
                <div key={i} className="w-20 h-32 bg-zinc-800 rounded-xl border-4 border-zinc-700 shadow-2xl flex items-center justify-center">
                    {phase === 'showdown' ? (
                        <span className={`text-2xl font-bold ${aiHand[i].suit === '♥' || aiHand[i].suit === '♦' ? 'text-red-500' : 'text-zinc-300'}`}>
                            {aiHand[i].value}{aiHand[i].suit}
                        </span>
                    ) : '?' }
                </div>
            ))}
            </div>
        </div>

        {/* Board */}
        <div className="flex gap-4 p-6 bg-emerald-900/50 rounded-3xl border-4 border-emerald-800 shadow-inner">
            <AnimatePresence>
            {communityCards.map((c, i) => (
                <motion.div
                    key={c.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.1 }}
                    className="w-20 h-32 bg-white rounded-xl shadow-xl flex flex-col items-center justify-center border-2 border-stone-200"
                >
                    <span className={`text-3xl font-black ${c.suit === '♥' || c.suit === '♦' ? 'text-red-600' : 'text-stone-800'}`}>
                        {c.value}<br/>{c.suit}
                    </span>
                </motion.div>
            ))}
            </AnimatePresence>
            {communityCards.length === 0 && <p className="text-emerald-300/30 text-xl font-bold p-12 italic">En attente des jetons...</p>}
        </div>

        {/* Player Area */}
        <div className="text-center">
            <div className="flex gap-4 mb-4">
                {playerHand.map((c, i) => (
                    <motion.div
                        key={i}
                        whileHover={{ y: -10 }}
                        className="w-24 h-36 bg-white rounded-xl border-4 border-stone-100 shadow-2xl flex flex-col items-center justify-center"
                    >
                        <span className={`text-3xl font-black ${c.suit === '♥' || c.suit === '♦' ? 'text-red-600' : 'text-stone-800'}`}>
                            {c.value}{c.suit}
                        </span>
                    </motion.div>
                ))}
            </div>
            <div className="flex gap-4">
                <Button 
                    onClick={() => { setPot(p => p + 100); setPlayerChips(c => c - 100); nextPhase(); }}
                    disabled={phase === 'showdown'}
                    className="bg-gradient-to-r from-blue-600 to-indigo-700 h-14 px-8 font-black"
                >
                    Miser 100 🪙
                </Button>
                <Button 
                    variant="outline"
                    onClick={() => setWinner('ai')}
                    disabled={phase === 'showdown'}
                    className="border-red-500/50 text-red-400 hover:bg-red-500/10 h-14"
                >
                    Se coucher
                </Button>
            </div>
            <p className="mt-4 text-blue-200">Vos jetons: {playerChips} 🪙</p>
        </div>
      </div>
    </div>
  );
};

export default Poker;
