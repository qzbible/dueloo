import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

const GRID_SIZE = 20;
const INITIAL_SNAKE = [[10, 10], [10, 11], [10, 12]];
const INITIAL_DIR = [0, -1];

const Snake = ({ onSubmit }) => {
  const canvasRef = useRef(null);
  const [snake, setSnake] = useState(INITIAL_SNAKE);
  const [dir, setDir] = useState(INITIAL_DIR);
  const [food, setFood] = useState([5, 5]);
  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [paused, setPaused] = useState(false);

  const moveSnake = useCallback(() => {
    if (gameOver || paused) return;

    const newHead = [snake[0][0] + dir[0], snake[0][1] + dir[1]];

    // Wall collision
    if (newHead[0] < 0 || newHead[0] >= GRID_SIZE || newHead[1] < 0 || newHead[1] >= GRID_SIZE) {
      setGameOver(true);
      return;
    }

    // Self collision
    if (snake.some(segment => segment[0] === newHead[0] && segment[1] === newHead[1])) {
      setGameOver(true);
      return;
    }

    const newSnake = [newHead, ...snake];

    // Food collision
    if (newHead[0] === food[0] && newHead[1] === food[1]) {
      setScore(s => s + 10);
      setFood([Math.floor(Math.random() * GRID_SIZE), Math.floor(Math.random() * GRID_SIZE)]);
    } else {
      newSnake.pop();
    }

    setSnake(newSnake);
  }, [snake, dir, food, gameOver, paused]);

  useEffect(() => {
    const handleKey = (e) => {
      switch (e.key) {
        case 'ArrowUp': if (dir[1] !== 1) setDir([0, -1]); break;
        case 'ArrowDown': if (dir[1] !== -1) setDir([0, 1]); break;
        case 'ArrowLeft': if (dir[0] !== 1) setDir([-1, 0]); break;
        case 'ArrowRight': if (dir[0] !== -1) setDir([1, 0]); break;
        default: break;
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [dir]);

  useEffect(() => {
    const interval = setInterval(moveSnake, 150);
    return () => clearInterval(interval);
  }, [moveSnake]);

  useEffect(() => {
    const ctx = canvasRef.current.getContext('2d');
    ctx.clearRect(0, 0, 400, 400);

    // Grid
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    for(let i=0; i<=400; i+=20){
        ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, 400); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(400, i); ctx.stroke();
    }

    // Snake
    snake.forEach((segment, i) => {
      ctx.fillStyle = i === 0 ? '#4ade80' : '#22c55e';
      ctx.fillRect(segment[0] * 20, segment[1] * 20, 18, 18);
    });

    // Food
    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.arc(food[0] * 20 + 10, food[1] * 20 + 10, 8, 0, Math.PI * 2);
    ctx.fill();
  }, [snake, food]);

  useEffect(() => {
    if (gameOver) {
      setTimeout(() => onSubmit({ score: Math.floor(score / 5) }), 1500);
    }
  }, [gameOver, score, onSubmit]);

  return (
    <div className="max-w-md mx-auto text-center">
      <div className="flex justify-between items-center mb-6">
        <div className="text-left">
          <h2 className="text-3xl font-black text-white">Snake</h2>
          <p className="text-blue-200">Score: {score}</p>
        </div>
        <Button onClick={() => setPaused(!paused)} variant="outline" className="border-white/20 text-white">
          {paused ? 'Reprendre' : 'Pause'}
        </Button>
      </div>

      <Card className="p-2 bg-slate-900 border-white/10 relative overflow-hidden">
        <canvas ref={canvasRef} width={400} height={400} className="w-full h-auto rounded-lg" />
        {gameOver && (
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center">
            <div className="text-white">
              <h3 className="text-4xl font-black mb-4">Game Over</h3>
              <p className="text-xl mb-6 text-blue-200">Score final: {score}</p>
            </div>
          </div>
        )}
      </Card>

      <div className="mt-8 grid grid-cols-3 gap-2 max-w-[150px] mx-auto sm:hidden">
        <div /> <Button onClick={() => dir[1] !== 1 && setDir([0, -1])}>^</Button> <div />
        <Button onClick={() => dir[0] !== 1 && setDir([-1, 0])}>&lt;</Button>
        <Button onClick={() => dir[1] !== -1 && setDir([0, 1])}>v</Button>
        <Button onClick={() => dir[0] !== -1 && setDir([1, 0])}>&gt;</Button>
      </div>
    </div>
  );
};

export default Snake;
