import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { io } from 'socket.io-client';
import axios from 'axios';
import { useTranslation } from '@/hooks/useTranslation';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Users, Play, ChevronRight, Trophy, Crown } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

const GroupHost = () => {
  const navigate = useNavigate();
  const { sessionId } = useParams();
  const location = useLocation();
  const { t } = useTranslation();
  const socketRef = useRef(null);
  const [session, setSession] = useState(null);
  const [pinCode] = useState(location.state?.pin_code || '');
  const [started, setStarted] = useState(false);
  const [currentQ, setCurrentQ] = useState(-1);
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [finished, setFinished] = useState(false);
  const [liveLeaderboard, setLiveLeaderboard] = useState([]);
  const [totalQuestions, setTotalQuestions] = useState(0);

  useEffect(() => {
    socketRef.current = io(BACKEND_URL, { path: '/api/socket.io', transports: ['websocket', 'polling'] });
    socketRef.current.on('connect', () => socketRef.current.emit('join_group_room', { session_id: sessionId }));
    
    socketRef.current.on('group_started', (data) => {
      setTotalQuestions(data.total_questions || 0);
    });
    
    socketRef.current.on('group_leaderboard', (data) => {
      setLiveLeaderboard(data.players || []);
    });
    
    socketRef.current.on('group_finished', (data) => {
      setFinished(true);
      setLiveLeaderboard(data.players || []);
    });

    fetchSession();
    const interval = setInterval(fetchSession, 5000);
    return () => { clearInterval(interval); socketRef.current?.disconnect(); };
  }, [sessionId]);

  const fetchSession = async () => {
    try {
      const res = await axios.get(`${BACKEND_URL}/api/group/${sessionId}`, { withCredentials: true });
      setSession(res.data);
      if (res.data.players?.length > 0 && liveLeaderboard.length === 0) {
        setLiveLeaderboard(res.data.players);
      }
    } catch (e) {}
  };

  const startSession = async () => {
    try {
      const res = await axios.post(`${BACKEND_URL}/api/group/${sessionId}/start`, {}, { withCredentials: true });
      setStarted(true);
      setCurrentQ(0);
      setTotalQuestions(res.data.total_questions || 0);
    } catch (e) { alert(e.response?.data?.detail || 'Error'); }
  };

  const nextQuestion = async () => {
    try {
      const res = await axios.post(`${BACKEND_URL}/api/group/${sessionId}/next`, {}, { withCredentials: true });
      if (res.data.finished) {
        setFinished(true);
        fetchSession();
      } else {
        setCurrentQ(res.data.question_index);
        setCurrentQuestion({ text: res.data.text, index: res.data.question_index });
      }
    } catch (e) {}
  };

  const sortedPlayers = [...liveLeaderboard].sort((a, b) => b.score - a.score);

  if (finished) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #1E3A8A 0%, #312E81 50%, #1E3A8A 100%)' }}>
        <Card className="p-8 bg-white/10 backdrop-blur-md border-white/20 max-w-lg w-full mx-4">
          <div className="text-center mb-6">
            <Trophy className="w-16 h-16 text-yellow-400 mx-auto mb-4" />
            <h2 className="text-3xl font-bold text-white">{t('group.final_ranking')}</h2>
          </div>
          <div className="space-y-3">
            {sortedPlayers.map((p, i) => (
              <div key={p.user_id} className={`flex items-center gap-3 p-3 rounded-lg ${i === 0 ? 'bg-yellow-500/20 ring-2 ring-yellow-400' : i === 1 ? 'bg-gray-300/10' : i === 2 ? 'bg-amber-700/10' : 'bg-white/5'}`}>
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

  return (
    <div className="min-h-screen relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #1E3A8A 0%, #312E81 50%, #1E3A8A 100%)' }}>
      <div className="relative z-10 container mx-auto px-4 py-8 max-w-3xl">
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold text-white mb-2" style={{ fontFamily: 'Fraunces, serif' }}>{session?.name || 'Session'}</h1>
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-5 mb-4 border border-white/20">
            <p className="text-blue-200 text-sm mb-1">{t('group.pin_label')}</p>
            <p className="text-5xl font-bold text-yellow-400 tracking-widest">{pinCode}</p>
          </div>
          <p className="text-blue-200"><Users className="w-4 h-4 inline mr-1" />{session?.players?.length || 0} {t('group.players_connected')}</p>
        </div>

        {!started ? (
          <>
            {session?.players?.length > 0 && (
              <Card className="p-4 bg-white/10 backdrop-blur-md border-white/20 mb-6">
                <div className="flex flex-wrap gap-2">
                  {session.players.map((p, i) => (
                    <motion.span key={i} initial={{ scale: 0 }} animate={{ scale: 1 }} className="px-3 py-1 bg-white/10 rounded-full text-sm text-white">{p.name}</motion.span>
                  ))}
                </div>
              </Card>
            )}
            <Button data-testid="start-group-session" onClick={startSession} disabled={!session?.players?.length} className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 text-white text-lg py-6">
              <Play className="w-5 h-5 mr-2" />{t('group.start_session')} ({session?.players?.length || 0} joueurs)
            </Button>
          </>
        ) : (
          <div className="grid md:grid-cols-2 gap-6">
            {/* Question panel */}
            <div>
              <AnimatePresence mode="wait">
                {currentQuestion ? (
                  <motion.div key={currentQuestion.index} initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                    <Card className="p-6 bg-white/10 backdrop-blur-md border-white/20 mb-4">
                      <p className="text-blue-200 text-xs mb-2">Question {currentQuestion.index + 1}/{totalQuestions}</p>
                      <p className="text-white text-lg font-semibold">{currentQuestion.text}</p>
                    </Card>
                  </motion.div>
                ) : (
                  <Card className="p-6 bg-white/10 backdrop-blur-md border-white/20 mb-4 text-center">
                    <p className="text-blue-200">{t('group.waiting_question')}</p>
                  </Card>
                )}
              </AnimatePresence>
              <Button data-testid="next-group-question" onClick={nextQuestion} className="w-full bg-gradient-to-r from-blue-500 to-purple-600 text-white text-lg py-5">
                <ChevronRight className="w-5 h-5 mr-2" />
                {currentQ < 0 ? t('group.next_question') : `Question ${currentQ + 2}`}
              </Button>
            </div>

            {/* Live leaderboard */}
            <Card className="p-4 bg-white/10 backdrop-blur-md border-white/20">
              <div className="flex items-center gap-2 mb-3">
                <Crown className="w-4 h-4 text-yellow-400" />
                <h3 className="text-white font-bold text-sm">Classement en direct</h3>
              </div>
              <div className="space-y-2">
                {sortedPlayers.map((p, i) => (
                  <motion.div key={p.user_id} layout className={`flex items-center gap-2 p-2 rounded-lg text-sm ${i === 0 ? 'bg-yellow-500/20' : 'bg-white/5'}`}>
                    <span className="text-white w-5 font-bold">{i + 1}</span>
                    <span className="text-white flex-1 truncate">{p.name}</span>
                    <span className="text-yellow-400 font-bold">{p.score}</span>
                  </motion.div>
                ))}
                {sortedPlayers.length === 0 && <p className="text-blue-200 text-xs text-center">En attente de réponses...</p>}
              </div>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
};

export default GroupHost;
