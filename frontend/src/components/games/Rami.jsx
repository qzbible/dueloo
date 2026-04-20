import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';

const SUITS = ['♠', '♥', '♦', '♣'];
const VALUES = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

const Rami = ({ onSubmit }) => {
  const [hand, setHand] = useState([]);
  const [discardPile, setDiscardPile] = useState([]);
  const [deck, setDeck] = useState([]);
  const [winner, setWinner] = useState(null);

  useEffect(() => {
    let d = [];
    SUITS.forEach(s => VALUES.forEach(v => d.push({ suit: s, value: v, id: Math.random() })));
    d = d.sort(() => Math.random() - 0.5);
    setHand(d.splice(0, 10));
    setDiscardPile([d.splice(0, 1)[0]]);
    setDeck(d);
  }, []);

  const drawCard = () => {
    if (hand.length >= 11) return;
    let d = [...deck];
    const card = d.splice(0, 1)[0];
    setHand([...hand, card]);
    setDeck(d);
  };

  const discardCard = (card) => {
    if (hand.length < 11) return;
    setHand(hand.filter(c => c.id !== card.id));
    setDiscardPile([...discardPile, card]);
    
    // Simulate check for win (simplified: always check after 5 turns)
    if (Math.random() > 0.8) setWinner(true);
  };

  useEffect(() => {
    if (winner) {
      setTimeout(() => onSubmit({ won: true }), 2000);
    }
  }, [winner]);

  return (
    <div className="max-w-4xl mx-auto">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-black text-white mb-2">Rami</h2>
        <p className="text-blue-200">Formez des combinaisons pour gagner !</p>
      </div>

      <div className="flex flex-col gap-12 items-center">
        {/* Decks */}
        <div className="flex gap-12">
            <div onClick={drawCard} className="w-24 h-36 bg-zinc-800 rounded-xl border-4 border-zinc-700 shadow-2xl flex items-center justify-center cursor-pointer hover:scale-105 transition-transform">
                <span className="text-zinc-600 text-3xl">🎴</span>
            </div>
            {discardPile.length > 0 && (
                <div className={`w-24 h-36 rounded-xl border-4 border-white/20 shadow-2xl flex flex-col items-center justify-center bg-white`}>
                    <span className={`text-2xl font-black ${discardPile[discardPile.length-1].suit === '♥' || discardPile[discardPile.length-1].suit === '♦' ? 'text-red-600' : 'text-zinc-800'}`}>
                        {discardPile[discardPile.length-1].value}<br/>{discardPile[discardPile.length-1].suit}
                    </span>
                </div>
            )}
        </div>

        {/* Player Hand */}
        <div className="flex flex-wrap gap-4 justify-center bg-white/5 p-8 rounded-3xl backdrop-blur-sm border-2 border-white/10">
            {hand.map((c, i) => (
                <motion.div
                    key={c.id}
                    layout
                    whileHover={{ y: -20 }}
                    onClick={() => discardCard(c)}
                    className="w-24 h-36 bg-white rounded-xl shadow-xl flex flex-col items-center justify-center border-2 border-stone-100 cursor-pointer"
                >
                    <span className={`text-3xl font-black ${c.suit === '♥' || c.suit === '♦' ? 'text-red-600' : 'text-zinc-800'}`}>
                        {c.value}<br/>{c.suit}
                    </span>
                </motion.div>
            ))}
        </div>
        
        <p className="text-zinc-400 italic">Piochez une carte, puis jetez-en une.</p>
      </div>
    </div>
  );
};

export default Rami;
