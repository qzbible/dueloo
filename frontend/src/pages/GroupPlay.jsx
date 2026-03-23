import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { io } from 'socket.io-client';
import { useTranslation } from '@/hooks/useTranslation';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Trophy, Clock, Check, X } from 'lucide-react';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

const GroupPlay = () => {
  const navigate = useNavigate();
  const { sessionId } = useParams();
  const { t } = useTranslation();
  const socketRef = useRef(null);
  const [question, setQuestion] = useState(null);
  const [answered, setAnswered] = useState(false);
  const [lastResult, setLastResult] = useState(null);
  const [myScore, setMyScore] = useState(0);
  const [finished, setFinished] = useState(false);
  const [players, setPlayers] = useState([]);
  const [waiting, setWaiting] = useState(true);

  useEffect(() => {
    socketRef.current = io(BACKEND_URL, { path: '/api/socket.io', transports: ['websocket', 'polling'] });
    socketRef.current.on('connect', () => {
      socketRef.current.emit('join_group_room', { session_id: sessionId });
    });

    socketRef.current.on('joined_group', () => setWaiting(true));

    socketRef.current.on('group_started', () => setWaiting(false));

    socketRef.current.on('group_question', (data) => {
      setQuestion(data);
      setAnswered(false);
      setLastResult(null);
    });

    socketRef.current.on('group_answer_result', (data) => {
      setLastResult(data);
      if (data.correct) setMyScore(prev => prev + data.points);
    });

    socketRef.current.on('group_finished', (data) => {
      setFinished(true);
      setPlayers(data.players || []);
    });

    return () => { socketRef.current?.disconnect(); };
  }, [sessionId]);

  const submitAnswer = (answer) => {
    if (answered) return;
    setAnswered(true);
    
    const userId = 'player_' + Math.random().toString(36).slice(2, 8);
    socketRef.current.emit('group_answer', {
      session_id: sessionId,
      user_id: userId,
      answer: answer,
      question_index: question.question_index
    });
  };

  if (finished) {
    const sorted = [...players].sort((a, b) => b.score - a.score);
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #1E3A8A 0%, #312E81 50%, #1E3A8A 100%)' }}>
        <Card className="p-8 bg-white/10 backdrop-blur-md border-white/20 max-w-lg w-full mx-4">
          <div className="text-center mb-6">
            <Trophy className="w-16 h-16 text-yellow-400 mx-auto mb-4" />
            <h2 className="text-3xl font-bold text-white">{t('group.final_ranking')}</h2>
          </div>
          <div className="space-y-3">
            {sorted.map((p, i) => (
              <div key={p.user_id || i} className={`flex items-center gap-3 p-3 rounded-lg ${i === 0 ? 'bg-yellow-500/20 ring-2 ring-yellow-400' : 'bg-white/5'}`}>
                <span className="text-2xl font-bold text-white w-8">{i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}`}</span>
                <span className="text-white font-medium flex-1">{p.name}</span>
                <span className="text-yellow-400 font-bold">{p.score}</span>
              </div>
            ))}
          </div>
          <Button onClick={() => navigate('/group')} className="w-full mt-6 bg-white/10 text-white hover:bg-white/20">{t('group.back_home')}</Button>
        </Card>
      </div>
    );
  }

  if (waiting) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #1E3A8A 0%, #312E81 50%, #1E3A8A 100%)' }}>
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-yellow-400 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-white text-lg">{t('group.waiting_host')}</p>
          <p className="text-blue-200 mt-2 text-4xl font-bold">{myScore}</p>
        </div>
      </div>
    );
  }

  if (!question) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #1E3A8A 0%, #312E81 50%, #1E3A8A 100%)' }}>
        <div className="text-center">
          <Clock className="w-12 h-12 text-yellow-400 mx-auto mb-4 animate-pulse" />
          <p className="text-white text-lg">{t('group.waiting_question')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'linear-gradient(135deg, #1E3A8A 0%, #312E81 50%, #1E3A8A 100%)' }}>
      <div className="max-w-lg w-full">
        <div className="text-center mb-4">
          <span className="text-blue-200 text-sm">Question {question.question_index + 1}/{question.total}</span>
          <span className="text-yellow-400 font-bold ml-4">Score: {myScore}</span>
        </div>

        <motion.div key={question.question_index} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="p-6 bg-white/10 backdrop-blur-md border-white/20 mb-6">
            <h2 className="text-xl font-bold text-white text-center">{question.text}</h2>
          </Card>
        </motion.div>

        {lastResult ? (
          <motion.div initial={{ scale: 0.8 }} animate={{ scale: 1 }} className="text-center">
            <div className={`inline-flex items-center gap-2 px-6 py-3 rounded-full text-lg font-bold ${lastResult.correct ? 'bg-emerald-500/30 text-emerald-300' : 'bg-red-500/30 text-red-300'}`}>
              {lastResult.correct ? <Check className="w-6 h-6" /> : <X className="w-6 h-6" />}
              {lastResult.correct ? `+${lastResult.points}` : '0'}
            </div>
          </motion.div>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            <Button data-testid="group-answer-true" onClick={() => submitAnswer(true)} disabled={answered} className="py-8 text-lg bg-emerald-500/20 border-2 border-emerald-400 text-white hover:bg-emerald-500/40">
              {t('group.true')}
            </Button>
            <Button data-testid="group-answer-false" onClick={() => submitAnswer(false)} disabled={answered} className="py-8 text-lg bg-red-500/20 border-2 border-red-400 text-white hover:bg-red-500/40">
              {t('group.false')}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default GroupPlay;
