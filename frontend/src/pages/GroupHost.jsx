import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
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
  const [finished, setFinished] = useState(false);

  useEffect(() => {
    socketRef.current = io(BACKEND_URL, { path: '/api/socket.io', transports: ['websocket', 'polling'] });
    socketRef.current.on('connect', () => socketRef.current.emit('join_group_room', { session_id: sessionId }));
    fetchSession();
    const interval = setInterval(fetchSession, 3000);
    return () => { clearInterval(interval); socketRef.current?.disconnect(); };
  }, [sessionId]);

  const fetchSession = async () => {
    try {
      const res = await axios.get(`${BACKEND_URL}/api/group/${sessionId}`, { withCredentials: true });
      setSession(res.data);
    } catch (e) {}
  };

  const startSession = async () => {
    try {
      await axios.post(`${BACKEND_URL}/api/group/${sessionId}/start`, {}, { withCredentials: true });
      setStarted(true);
      setCurrentQ(0);
      fetchSession();
    } catch (e) { alert(e.response?.data?.detail || 'Error'); }
  };

  const nextQuestion = async () => {
    try {
      const res = await axios.post(`${BACKEND_URL}/api/group/${sessionId}/next`, {}, { withCredentials: true });
      if (res.data.finished) { setFinished(true); fetchSession(); }
      else { setCurrentQ(res.data.question_index); }
    } catch (e) {}
  };

  if (finished && session) {
    const sorted = [...(session.players || [])].sort((a, b) => b.score - a.score);
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #1E3A8A 0%, #312E81 50%, #1E3A8A 100%)' }}>
        <Card className="p-8 bg-white/10 backdrop-blur-md border-white/20 max-w-lg w-full mx-4">
          <div className="text-center mb-6">
            <Trophy className="w-16 h-16 text-yellow-400 mx-auto mb-4" />
            <h2 className="text-3xl font-bold text-white">{t('group.final_ranking')}</h2>
          </div>
          <div className="space-y-3">
            {sorted.map((p, i) => (
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
      <div className="relative z-10 container mx-auto px-4 py-8 max-w-2xl">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-2" style={{ fontFamily: 'Fraunces, serif' }}>{session?.name || 'Session'}</h1>
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 mb-6 border border-white/20">
            <p className="text-blue-200 text-sm mb-2">{t('group.pin_label')}</p>
            <p className="text-5xl font-bold text-yellow-400 tracking-widest">{pinCode}</p>
          </div>
          <p className="text-blue-200"><Users className="w-4 h-4 inline mr-1" />{session?.players?.length || 0} {t('group.players_connected')}</p>
        </div>

        {session?.players?.length > 0 && (
          <Card className="p-4 bg-white/10 backdrop-blur-md border-white/20 mb-6">
            <div className="flex flex-wrap gap-2">
              {session.players.map((p, i) => (
                <motion.span key={i} initial={{ scale: 0 }} animate={{ scale: 1 }} className="px-3 py-1 bg-white/10 rounded-full text-sm text-white">{p.name}</motion.span>
              ))}
            </div>
          </Card>
        )}

        {!started ? (
          <Button data-testid="start-group-session" onClick={startSession} className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 text-white text-lg py-6">
            <Play className="w-5 h-5 mr-2" />{t('group.start_session')}
          </Button>
        ) : (
          <div className="text-center">
            <p className="text-blue-200 mb-4">Question {currentQ + 1}</p>
            <Button data-testid="next-group-question" onClick={nextQuestion} className="w-full bg-gradient-to-r from-blue-500 to-purple-600 text-white text-lg py-6">
              <ChevronRight className="w-5 h-5 mr-2" />{t('group.next_question')}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default GroupHost;
