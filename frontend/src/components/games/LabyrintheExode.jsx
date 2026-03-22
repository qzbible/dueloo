import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

const LabyrintheExode = ({ onSubmit }) => {
  const [gameData, setGameData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [playerPos, setPlayerPos] = useState(null);
  const [path, setPath] = useState(new Set());
  const [timeLeft, setTimeLeft] = useState(90);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [showQuestion, setShowQuestion] = useState(false);
  const [questionsCorrect, setQuestionsCorrect] = useState(0);
  const [completed, setCompleted] = useState(false);
  const [steps, setSteps] = useState(0);

  useEffect(() => {
    fetchGameData();
  }, []);

  useEffect(() => {
    if (!gameData || completed || showQuestion) return;
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          handleFinish(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [gameData, completed, showQuestion]);

  const handleFinish = useCallback((won) => {
    if (completed) return;
    setCompleted(true);
    const timeBonus = Math.floor(timeLeft / 15);
    setTimeout(() => {
      onSubmit({ completed: won, questions_correct: questionsCorrect, time_bonus: won ? timeBonus : 0 });
    }, 1000);
  }, [completed, timeLeft, questionsCorrect, onSubmit]);

  useEffect(() => {
    if (!gameData || !playerPos) return;
    const [px, py] = playerPos;
    const [ex, ey] = gameData.end;
    if (px === ex && py === ey) {
      handleFinish(true);
    }
    if (steps > 0 && steps % 15 === 0 && questionIndex < (gameData.questions?.length || 0)) {
      setShowQuestion(true);
    }
  }, [playerPos, gameData, steps, questionIndex, handleFinish]);

  const fetchGameData = async () => {
    try {
      const response = await axios.post(
        `${BACKEND_URL}/api/games/start`,
        { mode_id: 'labyrinthe_exode' },
        { withCredentials: true }
      );
      const data = response.data.game_data;
      setGameData(data);
      setPlayerPos(data.start);
      setPath(new Set([`${data.start[0]}-${data.start[1]}`]));
    } catch (error) {
      console.error('Erreur:', error);
    } finally {
      setLoading(false);
    }
  };

  const move = useCallback((dx, dy) => {
    if (!gameData || completed || showQuestion) return;
    const [px, py] = playerPos;
    const nx = px + dx;
    const ny = py + dy;
    if (nx < 0 || nx >= gameData.width || ny < 0 || ny >= gameData.height) return;
    if (gameData.maze[ny][nx] === 1) return;
    setPlayerPos([nx, ny]);
    setPath(prev => new Set([...prev, `${nx}-${ny}`]));
    setSteps(s => s + 1);
  }, [gameData, playerPos, completed, showQuestion]);

  useEffect(() => {
    const handleKey = (e) => {
      const moves = { ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0] };
      if (moves[e.key]) { e.preventDefault(); move(...moves[e.key]); }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [move]);

  const answerQuestion = (idx) => {
    const q = gameData.questions[questionIndex];
    if (idx === q.answer) setQuestionsCorrect(prev => prev + 1);
    setQuestionIndex(prev => prev + 1);
    setShowQuestion(false);
  };

  if (loading || !gameData) {
    return <div className="text-center text-white">Génération du labyrinthe...</div>;
  }

  if (completed) {
    const won = playerPos[0] === gameData.end[0] && playerPos[1] === gameData.end[1];
    return (
      <div className="max-w-md mx-auto text-center" data-testid="maze-result">
        <Card className="p-8 bg-white/10 backdrop-blur-md border-white/20">
          <div className="text-6xl mb-4">{won ? '🏆' : '⏰'}</div>
          <h2 className="text-2xl font-bold text-white mb-2">
            {won ? 'Terre Promise atteinte !' : 'Temps écoulé !'}
          </h2>
          <p className="text-blue-200 mb-2">Pas : {steps} | Questions : {questionsCorrect}/{gameData.questions.length}</p>
          <p className="text-yellow-400 font-bold">Temps restant : {timeLeft}s</p>
        </Card>
      </div>
    );
  }

  if (showQuestion && questionIndex < gameData.questions.length) {
    const q = gameData.questions[questionIndex];
    return (
      <div className="max-w-lg mx-auto" data-testid="maze-question">
        <Card className="p-6 bg-white/10 backdrop-blur-md border-white/20">
          <h3 className="text-xl font-bold text-white mb-4 text-center">{q.text}</h3>
          <div className="grid grid-cols-2 gap-3">
            {q.options.map((opt, idx) => (
              <Button
                key={idx}
                data-testid={`maze-option-${idx}`}
                onClick={() => answerQuestion(idx)}
                className="bg-white/10 border border-white/20 text-white hover:bg-white/20 p-4"
              >
                {opt}
              </Button>
            ))}
          </div>
        </Card>
      </div>
    );
  }

  const viewSize = 9;
  const half = Math.floor(viewSize / 2);
  const [vpx, vpy] = playerPos;
  const startX = Math.max(0, Math.min(vpx - half, gameData.width - viewSize));
  const startY = Math.max(0, Math.min(vpy - half, gameData.height - viewSize));

  return (
    <div className="max-w-xl mx-auto" data-testid="labyrinthe-game">
      <div className="flex items-center justify-between mb-4">
        <span className="text-white font-semibold">Pas : {steps}</span>
        <span className={`font-bold text-lg ${timeLeft <= 15 ? 'text-red-400 animate-pulse' : 'text-yellow-400'}`}>
          {timeLeft}s
        </span>
        <span className="text-emerald-300 font-semibold">Q: {questionsCorrect}/{gameData.questions.length}</span>
      </div>

      <Card className="p-3 bg-white/5 backdrop-blur-md border-white/20 mb-4">
        <div className="grid gap-0.5 mx-auto" style={{ gridTemplateColumns: `repeat(${viewSize}, 1fr)`, maxWidth: '400px' }}>
          {Array.from({ length: viewSize }, (_, vy) =>
            Array.from({ length: viewSize }, (_, vx) => {
              const mx = startX + vx;
              const my = startY + vy;
              const isPlayer = mx === vpx && my === vpy;
              const isEnd = mx === gameData.end[0] && my === gameData.end[1];
              const isStart = mx === gameData.start[0] && my === gameData.start[1];
              const isWall = gameData.maze[my]?.[mx] === 1;
              const isPath = path.has(`${mx}-${my}`);

              return (
                <div
                  key={`${mx}-${my}`}
                  onClick={() => {
                    const dx = mx - vpx;
                    const dy = my - vpy;
                    if (Math.abs(dx) + Math.abs(dy) === 1) move(dx, dy);
                  }}
                  className={`aspect-square rounded-sm flex items-center justify-center text-xs sm:text-sm cursor-pointer transition-all
                    ${isPlayer ? 'bg-yellow-400 text-slate-900 font-bold shadow-lg shadow-yellow-400/50'
                    : isEnd ? 'bg-emerald-500/60 animate-pulse'
                    : isStart ? 'bg-blue-500/40'
                    : isWall ? 'bg-slate-800/80'
                    : isPath ? 'bg-blue-400/20'
                    : 'bg-white/5 hover:bg-white/10'}`}
                >
                  {isPlayer ? '🚶' : isEnd ? '⛪' : isStart ? '🏛️' : ''}
                </div>
              );
            })
          )}
        </div>
      </Card>

      <div className="grid grid-cols-3 gap-2 max-w-[180px] mx-auto">
        <div />
        <Button data-testid="move-up" onClick={() => move(0, -1)} size="sm" className="bg-white/10 text-white hover:bg-white/20">^</Button>
        <div />
        <Button data-testid="move-left" onClick={() => move(-1, 0)} size="sm" className="bg-white/10 text-white hover:bg-white/20">&lt;</Button>
        <Button data-testid="move-down" onClick={() => move(0, 1)} size="sm" className="bg-white/10 text-white hover:bg-white/20">v</Button>
        <Button data-testid="move-right" onClick={() => move(1, 0)} size="sm" className="bg-white/10 text-white hover:bg-white/20">&gt;</Button>
      </div>

      <p className="text-center text-blue-200 text-sm mt-4">
        Utilisez les touches fléchées ou les boutons pour vous déplacer
      </p>
    </div>
  );
};

export default LabyrintheExode;
