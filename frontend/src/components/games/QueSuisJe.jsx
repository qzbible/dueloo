import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';

const QueSuisJe = ({ onSubmit }) => {
  const [currentCharacter, setCurrentCharacter] = useState(null);
  const [options, setOptions] = useState([]);
  const [score, setScore] = useState(0);
  const [round, setRound] = useState(0);
  const [result, setResult] = useState(null);

  const characters = [
    { name: "Noé", clues: ["J'ai construit un grand bateau", "J'ai sauvé les animaux", "J'ai vu le premier arc-en-ciel"] },
    { name: "Moïse", clues: ["J'ai ouvert la mer Rouge", "J'ai reçu les 10 commandements", "J'ai été sauvé du Nil dans un panier"] },
    { name: "David", clues: ["J'ai vaincu un géant avec une fronde", "J'ai été le plus grand roi d'Israël", "J'ai écrit de nombreux Psaumes"] },
    { name: "Samson", clues: ["Ma force était dans mes cheveux", "J'ai combattu des phalanges de Philistins", "J'ai renversé un temple"] },
    { name: "Joseph", clues: ["J'avais une tunique multicolore", "Mes frères m'ont vendu comme esclave", "Je suis devenu gouverneur d'Égypte"] }
  ];

  const startRound = () => {
    const char = characters[Math.floor(Math.random() * characters.length)];
    setCurrentCharacter(char);
    
    let opts = [char.name];
    while (opts.length < 4) {
        const r = characters[Math.floor(Math.random()*characters.length)].name;
        if (!opts.includes(r)) opts.push(r);
    }
    setOptions(opts.sort(() => Math.random() - 0.5));
    setResult(null);
  };

  useEffect(() => startRound(), []);

  const handleGuess = (guess) => {
    if (result) return;
    const correct = guess === currentCharacter.name;
    setResult(correct ? 'TROUVÉ !' : 'NON...');
    if (correct) setScore(s => s + 1);
    
    setTimeout(() => {
        if (round + 1 >= 5) {
            onSubmit({ score: (score + (correct ? 1 : 0)) * 2 });
        } else {
            setRound(r => r + 1);
            startRound();
        }
    }, 1500);
  };

  return (
    <div className="max-w-2xl mx-auto text-center">
      <div className="mb-12">
        <h2 className="text-4xl font-black text-white mb-2">Qui suis-je ?</h2>
        <p className="text-blue-200">Devinez le personnage biblique d'après les indices !</p>
      </div>

      <Card className="p-8 bg-white/5 border-white/10 mb-8 backdrop-blur-md">
        <div className="space-y-4 text-xl text-white font-medium">
            {currentCharacter?.clues.map((c, i) => (
                <motion.div initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: i * 0.5 }} key={i}>
                    • {c}
                </motion.div>
            ))}
        </div>
        
        <AnimatePresence>
            {result && (
                <motion.div initial={{ scale: 0 }} animate={{ scale: 1.2 }} className={`absolute inset-0 flex items-center justify-center bg-black/40 ${result === 'TROUVÉ !' ? 'text-emerald-400' : 'text-red-500'} text-4xl font-black`}>
                    {result}
                </motion.div>
            )}
        </AnimatePresence>
      </Card>

      <div className="grid grid-cols-2 gap-4">
        {options.map((opt, i) => (
            <Button key={i} onClick={() => handleGuess(opt)} className="h-16 text-lg font-bold bg-white/10 hover:bg-white/20 text-white rounded-2xl border border-white/20">
                {opt}
            </Button>
        ))}
      </div>
    </div>
  );
};

export default QueSuisJe;
