import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

const LaManne = ({ onSubmit }) => {
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(30);
  const [fallingItems, setFallingItems] = useState([]);
  const [gameActive, setGameActive] = useState(true);

  useEffect(() => {
    if (timeLeft > 0 && gameActive) {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
      return () => clearTimeout(timer);
    } else if (timeLeft === 0) {
      setGameActive(false);
      onSubmit({ matches: score });
    }
  }, [timeLeft, gameActive]);

  useEffect(() => {
    if (!gameActive) return;
    
    const interval = setInterval(() => {
      const newItem = {
        id: Date.now(),
        x: Math.random() * 80 + 10,
        type: Math.random() > 0.3 ? 'bread' : 'stone',
        emoji: Math.random() > 0.3 ? '🍞' : '🪨'
      };
      setFallingItems(prev => [...prev, newItem]);
      
      setTimeout(() => {
        setFallingItems(prev => prev.filter(item => item.id !== newItem.id));
      }, 3000);
    }, 800);

    return () => clearInterval(interval);
  }, [gameActive]);

  const handleCatch = (item) => {
    if (item.type === 'bread') {
      setScore(score + 1);
    } else {
      setScore(Math.max(0, score - 1));
    }
    setFallingItems(prev => prev.filter(i => i.id !== item.id));
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex justify-between mb-6 text-white">
        <div className="text-2xl font-bold">Score: {score}</div>
        <div className="text-2xl font-bold">Temps: {timeLeft}s</div>
      </div>

      <Card className="relative h-96 bg-gradient-to-b from-blue-400/20 to-blue-900/20 backdrop-blur-sm border-white/20 overflow-hidden">
        <div className="absolute inset-0">
          {fallingItems.map(item => (
            <motion.div
              key={item.id}
              initial={{ y: -50, x: `${item.x}%` }}
              animate={{ y: 400 }}
              transition={{ duration: 3, ease: 'linear' }}
              className="absolute cursor-pointer text-4xl"
              onClick={() => handleCatch(item)}
              style={{ left: `${item.x}%` }}
            >
              {item.emoji}
            </motion.div>
          ))}
        </div>

        {!gameActive && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50">
            <div className="text-center text-white">
              <p className="text-4xl font-bold mb-4">Terminé !</p>
              <p className="text-2xl">Score final: {score}</p>
            </div>
          </div>
        )}
      </Card>

      <p className="text-center text-blue-200 mt-4">
        Attrapez le pain 🍞 (+1) et évitez les pierres 🪨 (-1) !
      </p>
    </div>
  );
};

export default LaManne;
