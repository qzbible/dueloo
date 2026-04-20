import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';

const Combat = ({ onSubmit }) => {
  const [playerHp, setPlayerHp] = useState(100);
  const [aiHp, setAiHp] = useState(100);
  const [log, setLog] = useState(['Le combat commence !']);
  const [turn, setTurn] = useState(0); // 0: Player, 1: AI
  const [winner, setWinner] = useState(null);
  const [isAnimating, setIsAnimating] = useState(false);

  const playerAction = (type) => {
    if (turn !== 0 || winner || isAnimating) return;
    setIsAnimating(true);
    
    let dmg = 0;
    let msg = '';
    
    if (type === 'attack') {
        dmg = 5 + Math.floor(Math.random() * 15);
        setAiHp(prev => Math.max(0, prev - dmg));
        msg = `Vous attaquez et infligez ${dmg} dégâts !`;
    } else if (type === 'heal') {
        const heal = 10 + Math.floor(Math.random() * 10);
        setPlayerHp(prev => Math.min(100, prev + heal));
        msg = `Vous vous soignez de ${heal} PV.`;
    }

    setLog(prev => [msg, ...prev.slice(0, 4)]);
    
    setTimeout(() => {
        setIsAnimating(false);
        if (aiHp - dmg <= 0) setWinner('player');
        else setTurn(1);
    }, 1000);
  };

  useEffect(() => {
    if (turn === 1 && !winner && !isAnimating) {
        setIsAnimating(true);
        setTimeout(() => {
            const dmg = 8 + Math.floor(Math.random() * 12);
            setPlayerHp(prev => Math.max(0, prev - dmg));
            setLog(prev => [`L'IA attaque et inflige ${dmg} dégâts !`, ...prev.slice(0, 4)]);
            
            if (playerHp - dmg <= 0) setWinner('ai');
            else setTurn(0);
            setIsAnimating(false);
        }, 1500);
    }
  }, [turn, winner, isAnimating, playerHp]);

  useEffect(() => {
    if (winner) {
        setTimeout(() => onSubmit({ won: winner === 'player' }), 2000);
    }
  }, [winner]);

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-12">
        <div className="text-center w-40">
            <h3 className="text-white font-bold mb-2">Vous</h3>
            <div className="h-4 bg-zinc-800 rounded-full overflow-hidden border-2 border-white/20">
                <motion.div animate={{ width: `${playerHp}%` }} className="h-full bg-emerald-500" />
            </div>
            <span className="text-white text-sm">{playerHp} / 100 PV</span>
        </div>
        
        <div className="text-4xl font-black text-white italic">VS</div>

        <div className="text-center w-40">
            <h3 className="text-white font-bold mb-2">IA</h3>
            <div className="h-4 bg-zinc-800 rounded-full overflow-hidden border-2 border-white/20">
                <motion.div animate={{ width: `${aiHp}%` }} className="h-full bg-red-500" />
            </div>
            <span className="text-white text-sm">{aiHp} / 100 PV</span>
        </div>
      </div>

      <div className="flex justify-between items-end h-64 mb-12 px-12">
        <motion.div 
            animate={isAnimating && turn === 0 ? { x: 100 } : { x: 0 }}
            className="text-8xl"
        >
            🤺
        </motion.div>
        <motion.div 
            animate={isAnimating && turn === 1 ? { x: -100 } : { x: 0 }}
            className="text-8xl scale-x-[-1]"
        >
            🥷
        </motion.div>
      </div>

      <div className="grid grid-cols-2 gap-8 items-start">
          <div className="flex flex-col gap-4">
              <Button onClick={() => playerAction('attack')} disabled={turn !== 0 || !!winner || isAnimating} className="h-16 bg-red-600 hover:bg-red-700 font-black text-xl rounded-2xl">ATTAQUER !</Button>
              <Button onClick={() => playerAction('heal')} disabled={turn !== 0 || !!winner || isAnimating} className="h-16 bg-blue-600 hover:bg-blue-700 font-black text-xl rounded-2xl">SOIGNER</Button>
          </div>
          <Card className="p-4 bg-black/40 border-white/10 h-36 flex flex-col justify-end text-sm">
              {log.map((l, i) => (
                  <div key={i} className={`mb-1 ${i === 0 ? 'text-white font-bold' : 'text-zinc-500'}`}>{l}</div>
              ))}
          </Card>
      </div>
      
      {winner && (
          <div className={`mt-8 text-center text-4xl font-black ${winner === 'player' ? 'text-yellow-400' : 'text-red-500'}`}>
              {winner === 'player' ? 'VICTOIRE !' : 'DÉFAITE...'}
          </div>
      )}
    </div>
  );
};

export default Combat;
