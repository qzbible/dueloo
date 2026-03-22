import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';

const BrebisPerdue = ({ onSubmit }) => {
  const [sheeps, setSheeps] = useState([]);
  const [found, setFound] = useState(false);
  const [clicks, setClicks] = useState(0);
  const [timeLeft, setTimeLeft] = useState(15);

  useEffect(() => {
    const newSheeps = Array(16).fill(null).map((_, i) => ({
      id: i,
      isLost: i === Math.floor(Math.random() * 16),
      emoji: i === Math.floor(Math.random() * 16) ? '🐑' : '🐏'
    }));
    setSheeps(newSheeps);
  }, []);

  useEffect(() => {
    if (timeLeft > 0 && !found) {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
      return () => clearTimeout(timer);
    } else if (timeLeft === 0 && !found) {
      onSubmit({ matches: 0 });
    }
  }, [timeLeft, found]);

  const handleClick = (sheep) => {
    setClicks(clicks + 1);
    
    if (sheep.isLost) {
      setFound(true);
      setTimeout(() => {
        onSubmit({ matches: 1 });
      }, 1000);
    }
  };

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex justify-between mb-6 text-white text-lg">
        <span>Clics: {clicks}</span>
        <span className={timeLeft <= 5 ? 'text-red-400 font-bold' : ''}>
          Temps: {timeLeft}s
        </span>
      </div>

      <Card className="p-6 bg-white/10 backdrop-blur-md border-white/20">
        <p className="text-center text-white text-xl mb-6">
          {found ? '🎉 Trouvée !' : 'Trouvez la brebis perdue (🐑) parmi le troupeau !'}
        </p>

        <div className="grid grid-cols-4 gap-4">
          {sheeps.map((sheep) => (
            <button
              key={sheep.id}
              onClick={() => !found && handleClick(sheep)}
              disabled={found}
              className={`text-6xl p-4 rounded-lg transition-all ${
                found && sheep.isLost
                  ? 'bg-emerald-500 scale-110'
                  : 'bg-white/10 hover:bg-white/20 hover:scale-105'
              }`}
            >
              {sheep.emoji}
            </button>
          ))}
        </div>
      </Card>
    </div>
  );
};

export default BrebisPerdue;
