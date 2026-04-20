import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Card } from '@/components/ui/card';

const AGARIO_SIZE = 2000;
const VIEW_SIZE = 800;

const Agario = ({ onSubmit }) => {
  const canvasRef = useRef(null);
  const [player, setPlayer] = useState({ x: 1000, y: 1000, r: 20, color: '#3b82f6' });
  const [food, setFood] = useState(generateFood(100));
  const [enemies, setEnemies] = useState(generateEnemies(10));
  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const mousePos = useRef({ x: 400, y: 400 });

  function generateFood(count) {
    return Array(count).fill(0).map(() => ({
      x: Math.random() * AGARIO_SIZE,
      y: Math.random() * AGARIO_SIZE,
      r: 5,
      color: `hsl(${Math.random() * 360}, 70%, 60%)`
    }));
  }

  function generateEnemies(count) {
    return Array(count).fill(0).map(() => ({
      x: Math.random() * AGARIO_SIZE,
      y: Math.random() * AGARIO_SIZE,
      r: 15 + Math.random() * 30,
      color: '#ef4444',
      vx: (Math.random() - 0.5) * 4,
      vy: (Math.random() - 0.5) * 4
    }));
  }

  const update = useCallback(() => {
    if (gameOver) return;

    setPlayer(p => {
      const dx = mousePos.current.x - 400;
      const dy = mousePos.current.y - 400;
      const angle = Math.atan2(dy, dx);
      const speed = 4;
      let nx = p.x + Math.cos(angle) * speed;
      let ny = p.y + Math.sin(angle) * speed;
      
      nx = Math.max(p.r, Math.min(AGARIO_SIZE - p.r, nx));
      ny = Math.max(p.r, Math.min(AGARIO_SIZE - p.r, ny));
      
      return { ...p, x: nx, y: ny };
    });

    setEnemies(ens => ens.map(e => {
        let nx = e.x + e.vx;
        let ny = e.y + e.vy;
        let nvx = e.vx, nvy = e.vy;
        if (nx < e.r || nx > AGARIO_SIZE - e.r) nvx = -nvx;
        if (ny < e.r || ny > AGARIO_SIZE - e.r) nvy = -nvy;
        return { ...e, x: nx, y: ny, vx: nvx, vy: nvy };
    }));

    // Collision detection
    checkCollisions();
  }, [gameOver]);

  const checkCollisions = () => {
    setFood(f => {
        const remaining = f.filter(item => {
            const dist = Math.hypot(player.x - item.x, player.y - item.y);
            if (dist < player.r) {
                setPlayer(p => ({ ...p, r: p.r + 0.2 }));
                setScore(s => s + 1);
                return false;
            }
            return true;
        });
        if (remaining.length < 100) return [...remaining, ...generateFood(5)];
        return remaining;
    });

    setEnemies(ens => {
        let lost = false;
        const remaining = ens.filter(e => {
            const dist = Math.hypot(player.x - e.x, player.y - e.y);
            if (dist < player.r + e.r) {
                if (player.r > e.r * 1.1) {
                    setPlayer(p => ({ ...p, r: p.r + e.r * 0.2 }));
                    setScore(s => s + Math.floor(e.r));
                    return false;
                } else if (e.r > player.r * 1.1) {
                    lost = true;
                }
            }
            return true;
        });
        if (lost) setGameOver(true);
        if (remaining.length < 10) return [...remaining, ...generateEnemies(1)];
        return remaining;
    });
  };

  useEffect(() => {
    const handleMove = (e) => {
        const rect = canvasRef.current.getBoundingClientRect();
        mousePos.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    };
    window.addEventListener('mousemove', handleMove);
    return () => window.removeEventListener('mousemove', handleMove);
  }, []);

  useEffect(() => {
    const interval = setInterval(update, 1000/60);
    return () => clearInterval(interval);
  }, [update]);

  useEffect(() => {
    const ctx = canvasRef.current.getContext('2d');
    ctx.clearRect(0, 0, VIEW_SIZE, VIEW_SIZE);

    const camX = player.x - VIEW_SIZE/2;
    const camY = player.y - VIEW_SIZE/2;

    // Grid lines
    ctx.strokeStyle = 'rgba(255,255,255,0.05)';
    for(let i=0; i<=AGARIO_SIZE; i+=100){
        ctx.beginPath(); ctx.moveTo(i - camX, -camY); ctx.lineTo(i - camX, AGARIO_SIZE - camY); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(-camX, i - camY); ctx.lineTo(AGARIO_SIZE - camX, i - camY); ctx.stroke();
    }

    // Food
    food.forEach(f => {
      ctx.fillStyle = f.color;
      ctx.beginPath(); ctx.arc(f.x - camX, f.y - camY, f.r, 0, Math.PI*2); ctx.fill();
    });

    // Enemies
    enemies.forEach(e => {
      ctx.fillStyle = e.color;
      ctx.beginPath(); ctx.arc(e.x - camX, e.y - camY, e.r, 0, Math.PI*2); ctx.fill();
    });

    // Player
    ctx.fillStyle = player.color;
    ctx.beginPath(); ctx.arc(player.x - camX, player.y - camY, player.r, 0, Math.PI*2); ctx.fill();
    ctx.shadowBlur = 20; ctx.shadowColor = player.color;
    ctx.strokeStyle = 'white'; ctx.lineWidth = 2; ctx.stroke();
  }, [player, food, enemies]);

  useEffect(() => {
    if (gameOver) {
      setTimeout(() => onSubmit({ score }), 1500);
    }
  }, [gameOver, score]);

  return (
    <div className="max-w-4xl mx-auto text-center">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-3xl font-black text-white">Agar.io-like</h2>
        <p className="text-blue-200 text-xl font-bold">Taille: {Math.floor(player.r * 2)} | Score: {score}</p>
      </div>

      <Card className="p-1 bg-zinc-950 border-4 border-white/10 relative overflow-hidden aspect-square">
        <canvas ref={canvasRef} width={VIEW_SIZE} height={VIEW_SIZE} className="w-full h-auto cursor-none" />
        <div className="absolute top-4 left-4 text-white/20 text-sm font-mono">MAP: {AGARIO_SIZE}x{AGARIO_SIZE}</div>
        {gameOver && (
          <div className="absolute inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center">
            <div className="text-center">
              <h3 className="text-6xl font-black text-white mb-4">MANGÉ !</h3>
              <p className="text-2xl text-blue-200">Score: {score}</p>
            </div>
          </div>
        )}
      </Card>
      <p className="mt-4 text-zinc-500 italic">Déplacez la souris vers l'endroit où vous voulez aller</p>
    </div>
  );
};

export default Agario;
