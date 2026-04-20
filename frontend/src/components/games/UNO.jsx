import React, { useState, useEffect, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';

const COLORS = ['red', 'blue', 'green', 'yellow'];
const VALUES = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', 'Skip', 'Reverse', '+2'];

const UNO = ({ onSubmit, duelMode, opponentMove, onMove, bothReady }) => {
  const [deck, setDeck] = useState(generateDeck());
  const [playerHand, setPlayerHand] = useState([]);
  const [aiHand, setAiHand] = useState([]);
  const [discardPile, setDiscardPile] = useState([]);
  const [turn, setTurn] = useState(0); // 0 for Player, 1 for AI
  const [winner, setWinner] = useState(null);

  function generateDeck() {
    let d = [];
    COLORS.forEach(c => {
      VALUES.forEach(v => {
        d.push({ color: c, value: v, id: Math.random() });
        if (v !== '0') d.push({ color: c, value: v, id: Math.random() });
      });
    });
    return d.sort(() => Math.random() - 0.5);
  }

  useEffect(() => {
    if (duelMode) {
      if (bothReady && duelMode.role === 'player1') {
        const d = [...deck];
        const p1Hand = d.splice(0, 7);
        const p2Hand = d.splice(0, 7);
        const firstDiscard = d.splice(0, 1)[0];
        
        setPlayerHand(p1Hand);
        setAiHand(p2Hand);
        setDiscardPile([firstDiscard]);
        setDeck(d);

        onMove({ 
          type: 'init', 
          deck: d, 
          p1Hand, 
          p2Hand, 
          discard: [firstDiscard] 
        });
      }
    } else {
      const d = [...deck];
      setPlayerHand(d.splice(0, 7));
      setAiHand(d.splice(0, 7));
      setDiscardPile([d.splice(0, 1)[0]]);
      setDeck(d);
    }
  }, [bothReady]);

  useEffect(() => {
    if (duelMode && opponentMove) {
      if (opponentMove.type === 'init' && duelMode.role === 'player2') {
        setPlayerHand(opponentMove.p2Hand);
        setAiHand(opponentMove.p1Hand);
        setDiscardPile(opponentMove.discard);
        setDeck(opponentMove.deck);
      } else if (opponentMove.type === 'play') {
        applyOpponentMove(opponentMove.card);
      } else if (opponentMove.type === 'draw') {
        drawCards(1, 1);
        setTurn(duelMode.role === 'player1' ? 0 : 1);
      }
    }
  }, [opponentMove]);

  const applyOpponentMove = (card) => {
    const newDiscard = [...discardPile, card];
    setDiscardPile(newDiscard);
    const newHand = aiHand.filter(c => c.id !== card.id);
    setAiHand(newHand);
    if (newHand.length === 0) setWinner(duelMode.role === 'player1' ? 1 : 0);
    else handleSpecialActions(card, duelMode.role === 'player1' ? 0 : 1);
  };

  const canPlay = (card) => {
    const top = discardPile[discardPile.length - 1];
    return card.color === top.color || card.value === top.value;
  };

  const playCard = (card, isAI = false) => {
    if (winner || (isAI && turn !== 1) || (!isAI && turn !== 0)) return;
    if (!canPlay(card)) return;

    const newDiscard = [...discardPile, card];
    setDiscardPile(newDiscard);

    if (isAI) {
      const newHand = aiHand.filter(c => c.id !== card.id);
      setAiHand(newHand);
      if (newHand.length === 0) setWinner(1);
      else handleSpecialActions(card, 0);
    } else {
      const newHand = playerHand.filter(c => c.id !== card.id);
      setPlayerHand(newHand);
      if (duelMode) onMove({ type: 'play', card });
      if (newHand.length === 0) setWinner(0);
      else handleSpecialActions(card, duelMode ? (duelMode.role === 'player1' ? 1 : 0) : 1);
    }
  };

  const handleSpecialActions = (card, nextTurn) => {
    if (card.value === 'Skip' || card.value === 'Reverse') {
        // In 2 player UNO, Skip and Reverse both give another turn
        // So turn remains the same as current
    } else if (card.value === '+2') {
        drawCards(nextTurn, 2); // Opponent draws 2
        setTurn(nextTurn);
    } else {
        setTurn(nextTurn);
    }
  };

  const drawCards = (target, count) => {
    let d = [...deck];
    if (d.length < count) d = [...d, ...generateDeck()];
    const drawn = d.splice(0, count);
    if (target === 0) setPlayerHand(prev => [...prev, ...drawn]);
    else setAiHand(prev => [...prev, ...drawn]);
    setDeck(d);
  };

  const makeAIMove = useCallback(() => {
    const playable = aiHand.filter(canPlay);
    if (playable.length > 0) {
      // Prioritize special cards
      playable.sort((a, b) => (isNaN(a.value) ? -1 : 1));
      playCard(playable[0], true);
    } else {
      drawCards(1, 1);
      setTurn(0);
    }
  }, [aiHand, discardPile]);

  useEffect(() => {
    if (!duelMode && turn === 1 && !winner) {
      const timer = setTimeout(makeAIMove, 1000);
      return () => clearTimeout(timer);
    }
  }, [turn, winner, makeAIMove, duelMode]);

  useEffect(() => {
    if (winner !== null) {
        const myRoleIndex = duelMode ? (duelMode.role === 'player1' ? 0 : 1) : 0;
        setTimeout(() => onSubmit({ won: winner === myRoleIndex }), 2000);
    }
  }, [winner, onSubmit, duelMode]);

  const topCard = discardPile[discardPile.length - 1];

  return (
    <div className="max-w-4xl mx-auto">
      <div className="text-center mb-8">
        <h2 className="text-4xl font-black text-white mb-2">UNO</h2>
        <p className="text-blue-200">
          {winner !== null ? (
            duelMode ? (winner === (duelMode.role === 'player1' ? 0 : 1) ? "Victoire !" : "Défaite !") :
            (winner === 0 ? "Vous avez gagné !" : "L'IA a gagné !")
          ) : (
            duelMode ? (
                (turn === (duelMode.role === 'player1' ? 0 : 1)) ? "À vous" : "Attente de l'adversaire..."
            ) : (
                turn === 0 ? "À vous" : "L'IA joue..."
            )
          )}
        </p>
      </div>

      <div className="flex flex-col gap-12 items-center">
        {/* AI Hand */}
        <div className="flex gap-2">
          {aiHand.map((c, i) => (
            <div key={i} className="w-12 h-20 bg-zinc-800 rounded-lg border-2 border-zinc-700 shadow-xl" />
          ))}
        </div>

        {/* Center */}
        <div className="flex gap-12 items-center">
          <div 
             onClick={() => {
                const isMyTurn = !duelMode || (turn === (duelMode.role === 'player1' ? 0 : 1));
                if (isMyTurn && !winner) {
                    if (duelMode) onMove({ type: 'draw' });
                    drawCards(0, 1); 
                    setTurn(turn === 0 ? 1 : 0);
                }
             }}
             className="w-24 h-36 bg-zinc-800 rounded-xl border-4 border-zinc-700 shadow-2xl flex items-center justify-center cursor-pointer hover:scale-105 transition-transform"
          >
            <span className="text-white font-bold">Pioche</span>
          </div>
          
          <AnimatePresence mode="wait">
            {topCard && (
              <motion.div
                key={topCard.id}
                initial={{ scale: 0, rotate: 20 }}
                animate={{ scale: 1, rotate: 0 }}
                className={`w-24 h-36 rounded-xl border-4 border-white/20 shadow-2xl flex flex-col items-center justify-center
                  ${topCard.color === 'red' ? 'bg-red-500' : topCard.color === 'blue' ? 'bg-blue-500' : topCard.color === 'green' ? 'bg-green-500' : 'bg-yellow-400'}`}
              >
                <span className="text-white text-3xl font-black">{topCard.value}</span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Player Hand */}
        <div className="flex flex-wrap gap-4 justify-center">
          {playerHand.map((c, i) => (
            <motion.div
              layout
              key={c.id}
              whileHover={canPlay(c) && (!duelMode || turn === (duelMode.role === 'player1' ? 0 : 1)) ? { y: -20, scale: 1.1 } : {}}
              onClick={() => {
                const isMyTurn = !duelMode || (turn === (duelMode.role === 'player1' ? 0 : 1));
                if (isMyTurn && canPlay(c)) playCard(c);
              }}
              className={`w-24 h-36 rounded-xl border-4 border-white/20 shadow-xl flex flex-col items-center justify-center cursor-pointer transition-all
                ${!canPlay(c) && turn === 0 ? 'grayscale opacity-50' : ''}
                ${c.color === 'red' ? 'bg-red-500' : c.color === 'blue' ? 'bg-blue-500' : c.color === 'green' ? 'bg-green-500' : 'bg-yellow-400'}`}
            >
              <span className="text-white text-2xl font-black">{c.value}</span>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default UNO;
