import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

const TowerDefense = ({ onSubmit }) => {
  const [towers, setTowers] = useState([]);
  const [enemies, setEnemies] = useState([]);
  const [money, setMoney] = useState(100);
  const [hp, setHp] = useState(10);
  const [wave, setWave] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const gameLoopRef = useRef();

  const spawnEnemy = useCallback(() => {
    setEnemies(prev => [...prev, { id: Date.now(), x: 800, hp: 10 + wave * 5, maxHp: 10 + wave * 5, speed: 1 + Math.random() }]);
  }, [wave]);

  useEffect(() => {
      const interval = setInterval(spawnEnemy, 2000);
      return () => clearInterval(interval);
  }, [spawnEnemy]);

  const update = useCallback(() => {
    if (gameOver) return;

    setEnemies(prev => {
      const next = prev.map(e => ({ ...e, x: e.x - e.speed }));
      // Damage base
      const reached = next.filter(e => e.x <= 0);
      if (reached.length > 0) setHp(h => Math.max(0, h - reached.length));
      
      // Filter dead and reached
      let remaining = next.filter(e => e.x > 0);
      
      // Tower shooting
      towers.forEach(t => {
          remaining.forEach(e => {
              const dist = Math.abs(t.x - e.x);
              if (dist < 150 && Math.random() < 0.05) {
                  e.hp -= 2;
              }
          });
      });

      const kills = remaining.filter(e => e.hp <= 0).length;
      if (kills > 0) setMoney(m => m + kills * 10);
      
      return remaining.filter(e => e.hp > 0);
    });

    if (hp <= 0) setGameOver(true);
  }, [gameOver, towers, hp]);

  useEffect(() => {
    gameLoopRef.current = requestAnimationFrame(function loop() {
      update();
      gameLoopRef.current = requestAnimationFrame(loop);
    });
    return () => cancelAnimationFrame(gameLoopRef.current);
  }, [update]);

  const placeTower = (x) => {
    if (money >= 50) {
      setTowers([...towers, { x, id: Date.now() }]);
      setMoney(money - 50);
    }
  };

  useEffect(() => {
    if (gameOver) {
      setTimeout(() => onSubmit({ waves_survived: wave }), 1500);
    }
  }, [gameOver, wave]);

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-8 text-white px-4">
        <div>
            <h2 className="text-3xl font-black mb-1">Défense Biblique</h2>
            <p className="text-blue-200">Placez des bibles pour repousser les doutes !</p>
        </div>
        <div className="flex gap-12 font-bold bg-white/5 p-4 rounded-2xl border border-white/10">
            <span className="text-yellow-400">🪙 {money}</span>
            <span className={`transition-colors ${hp < 3 ? 'text-red-500 animate-pulse' : 'text-emerald-400'}`}>❤️ {hp}</span>
        </div>
      </div>

      <Card className="h-64 bg-slate-900 border-b-8 border-slate-800 relative overflow-hidden flex items-end">
        {/* Base */}
        <div className="absolute left-0 top-0 bottom-0 w-12 bg-emerald-600/20 border-r-4 border-emerald-500/30 flex items-center justify-center">
            <span className="text-2xl">⛪</span>
        </div>

        {/* Enemies */}
        {enemies.map(e => (
            <motion.div 
                key={e.id} 
                style={{ right: 800 - e.x }}
                className="absolute top-1/2 -translate-y-1/2 w-8 h-8 flex flex-col items-center"
            >
                <div className="w-full h-1 bg-red-900 rounded-full mb-1">
                    <div className="h-full bg-red-500" style={{ width: `${(e.hp/e.maxHp)*100}%` }} />
                </div>
                <span className="text-2xl">👿</span>
            </motion.div>
        ))}

        {/* Towers */}
        {towers.map(t => (
            <div key={t.id} style={{ left: t.x }} className="absolute bottom-4 text-3xl">📖</div>
        ))}

        {/* Build spots */}
        <div className="absolute inset-x-0 bottom-0 top-0 flex items-end justify-around pb-2 opacity-0 hover:opacity-100 transition-opacity">
            {[100, 200, 300, 400, 500, 600].map(x => (
                <button key={x} onClick={() => placeTower(x)} className="w-12 h-12 bg-white/10 rounded-full hover:bg-white/20 border-2 border-dashed border-white/20 flex items-center justify-center text-xs text-white">50🪙</button>
            ))}
        </div>

        {gameOver && (
            <div className="absolute inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50">
                <div className="text-center">
                    <h3 className="text-5xl font-black text-white mb-2">DÉFENSE OVER</h3>
                    <p className="text-blue-200">Vagues survécues: {wave}</p>
                </div>
            </div>
        )}
      </Card>
      <p className="mt-4 text-center text-zinc-500 text-sm italic">Survolez le terrain pour placer des bibles (50🪙)</p>
    </div>
  );
};

export default TowerDefense;
