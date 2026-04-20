import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Card } from '@/components/ui/card';

const VIEW_W = 400;
const VIEW_H = 600;

const Course = ({ onSubmit, duelMode, opponentMove, onMove, bothReady }) => {
  const canvasRef = useRef(null);
  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const playerXRef = useRef(200);
  const opponentXRef = useRef(200);
  const opponentGameOverRef = useRef(false);
  const obstaclesRef = useRef([]);
  const scoreRef = useRef(0);
  const speedRef = useRef(5);
  const gameLoopRef = useRef();
  const seedRef = useRef(duelMode ? (parseInt(duelMode.matchId.slice(-4), 16) || 1) : Math.random());
  
  const pseudoRandom = () => {
    const x = Math.sin(seedRef.current++) * 10000;
    return x - Math.floor(x);
  };

  const update = useCallback(() => {
    if (gameOver) return;
    if (duelMode && !bothReady) return;

    // Update Speed and Score
    scoreRef.current += 1;
    speedRef.current = Math.min(15, 5 + Math.floor(scoreRef.current / 500));
    setScore(scoreRef.current);

    // Update Obstacles
    let next = obstaclesRef.current.map(o => ({ ...o, y: o.y + speedRef.current }));
    next = next.filter(o => o.y < VIEW_H);
    if (pseudoRandom() < 0.05) {
      next.push({ x: pseudoRandom() * (VIEW_W - 40), y: -50, w: 40, h: 80, color: '#ef4444' });
    }
    obstaclesRef.current = next;

    // Collision Check
    const px = playerXRef.current;
    next.forEach(o => {
      if (px < o.x + o.w && px + 40 > o.x && 500 < o.y + o.h && 500 + 80 > o.y) {
        setGameOver(true);
      }
    });

    if (duelMode && scoreRef.current % 10 === 0) {
      onMove({ type: 'pos', x: playerXRef.current });
    }

    draw();
  }, [gameOver, duelMode]);

  const draw = () => {
    const ctx = canvasRef.current.getContext('2d');
    ctx.clearRect(0, 0, VIEW_W, VIEW_H);

    // Road lines
    ctx.strokeStyle = 'rgba(255,255,255,0.2)';
    ctx.setLineDash([20, 20]);
    ctx.beginPath(); ctx.moveTo(VIEW_W/2, 0); ctx.lineTo(VIEW_W/2, VIEW_H); ctx.stroke();
    ctx.setLineDash([]);

    // Obstacles
    obstaclesRef.current.forEach(o => {
      ctx.fillStyle = o.color;
      ctx.fillRect(o.x, o.y, o.w, o.h);
      ctx.strokeStyle = 'white'; ctx.strokeRect(o.x, o.y, o.w, o.h);
    });

    // Player
    ctx.fillStyle = '#3b82f6';
    ctx.fillRect(playerXRef.current, 500, 40, 80);
    ctx.strokeStyle = 'white'; ctx.lineWidth = 2; ctx.strokeRect(playerXRef.current, 500, 40, 80);

    // Opponent
    if (duelMode) {
      ctx.globalAlpha = 0.5;
      ctx.fillStyle = '#10b981';
      ctx.fillRect(opponentXRef.current, 500, 40, 80);
      ctx.globalAlpha = 1.0;
    }
  };

  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === 'ArrowLeft') playerXRef.current = Math.max(0, playerXRef.current - 40);
      if (e.key === 'ArrowRight') playerXRef.current = Math.min(VIEW_W - 40, playerXRef.current + 40);
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, []);

  useEffect(() => {
    if (duelMode && opponentMove) {
      if (opponentMove.type === 'pos') {
        opponentXRef.current = opponentMove.x;
      } else if (opponentMove.type === 'gameOver') {
        opponentGameOverRef.current = true;
      }
    }
  }, [opponentMove, duelMode]);

  useEffect(() => {
    const loop = () => {
      update();
      gameLoopRef.current = requestAnimationFrame(loop);
    };
    gameLoopRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(gameLoopRef.current);
  }, [update]);

  useEffect(() => {
    if (gameOver) {
      if (duelMode) onMove({ type: 'gameOver' });
      cancelAnimationFrame(gameLoopRef.current);
      setTimeout(() => {
        const result = opponentGameOverRef.current || !duelMode ? { won: true, score: Math.floor(scoreRef.current / 10) } : { won: false, score: Math.floor(scoreRef.current / 10) };
        onSubmit(result);
      }, 1500);
    }
  }, [gameOver, onSubmit, duelMode]);

  return (
    <div className="max-w-md mx-auto text-center">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-3xl font-black text-white">Course</h2>
        <p className="text-blue-200 text-xl font-bold">Score: {score}</p>
      </div>

      <Card className="p-1 bg-zinc-800 border-x-8 border-zinc-700 relative overflow-hidden aspect-[2/3]">
        <canvas ref={canvasRef} width={VIEW_W} height={VIEW_H} className="w-full h-full bg-zinc-900" />
        {gameOver && (
          <div className="absolute inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center">
            <div className="text-center">
              <h3 className="text-5xl font-black text-white mb-4">CRASH !</h3>
              <p className="text-2xl text-blue-200">Score: {score}</p>
            </div>
          </div>
        )}
      </Card>
      <div className="mt-6 flex justify-center gap-4">
        <Button onMouseDown={() => playerXRef.current = Math.max(0, playerXRef.current - 40)} className="w-20 h-20 text-2xl font-black">←</Button>
        <Button onMouseDown={() => playerXRef.current = Math.min(VIEW_W - 40, playerXRef.current + 40)} className="w-20 h-20 text-2xl font-black">→</Button>
      </div>
    </div>
  );
};

export default Course;
