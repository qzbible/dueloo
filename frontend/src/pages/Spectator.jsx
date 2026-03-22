import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { io } from 'socket.io-client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { ArrowLeft, Eye, Users, Trophy, Zap } from 'lucide-react';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

const SpectatorList = () => {
  const navigate = useNavigate();
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMatches();
    const interval = setInterval(fetchMatches, 5000);
    return () => clearInterval(interval);
  }, []);

  const fetchMatches = async () => {
    try {
      const res = await axios.get(`${BACKEND_URL}/api/duo/active-matches`, { withCredentials: true });
      setMatches(res.data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #1E3A8A 0%, #312E81 50%, #1E3A8A 100%)' }}>
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-20 left-10 w-72 h-72 bg-yellow-400 rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-purple-400 rounded-full blur-3xl" />
      </div>
      <div className="relative z-10 container mx-auto px-4 py-8">
        <Button onClick={() => navigate('/games')} variant="outline" className="bg-white/10 border-white/20 text-white hover:bg-white/20 mb-6">
          <ArrowLeft className="w-4 h-4 mr-2" /> Retour
        </Button>

        <div className="text-center mb-10">
          <h1 className="text-4xl sm:text-5xl font-bold text-white mb-3" style={{ fontFamily: 'Fraunces, serif' }}>Mode Spectateur</h1>
          <p className="text-lg text-blue-200">Regardez les duels en temps réel</p>
        </div>

        {loading ? (
          <div className="text-center"><div className="w-12 h-12 border-4 border-yellow-400 border-t-transparent rounded-full animate-spin mx-auto" /></div>
        ) : matches.length === 0 ? (
          <div className="text-center text-blue-200 py-12">
            <Eye className="w-16 h-16 mx-auto mb-4 opacity-50" />
            <p className="text-lg">Aucun match en cours</p>
            <p className="text-sm mt-2">Les matchs Duo actifs apparaîtront ici</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {matches.map((m, i) => (
              <motion.div key={m.match_id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}>
                <Card data-testid={`spectate-match-${m.match_id}`} className="p-6 bg-white/10 backdrop-blur-md border-white/20 cursor-pointer hover:bg-white/15 transition-all" onClick={() => navigate(`/spectate/${m.match_id}`)}>
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-sm text-emerald-300 flex items-center gap-1"><Eye className="w-3 h-3" /> LIVE</span>
                    <span className="text-xs text-blue-300">Q{(m.current_question || 0) + 1}</span>
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-white font-medium">{m.player1_name || 'Joueur 1'}</span>
                      <span className="text-yellow-400 font-bold">{m.player1_score || 0}</span>
                    </div>
                    <div className="text-center text-xs text-blue-300">VS</div>
                    <div className="flex items-center justify-between">
                      <span className="text-white font-medium">{m.player2_name || 'Joueur 2'}</span>
                      <span className="text-yellow-400 font-bold">{m.player2_score || 0}</span>
                    </div>
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

const SpectatorView = () => {
  const navigate = useNavigate();
  const { matchId } = useParams();
  const socketRef = useRef(null);
  const [matchData, setMatchData] = useState(null);
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [scores, setScores] = useState({ player1: 0, player2: 0 });
  const [gameState, setGameState] = useState('connecting');
  const [finalResult, setFinalResult] = useState(null);

  useEffect(() => {
    socketRef.current = io(BACKEND_URL, {
      path: '/api/socket.io',
      transports: ['websocket', 'polling'],
      reconnection: true
    });

    socketRef.current.on('connect', () => {
      socketRef.current.emit('join_duo_room', { match_id: matchId, user_id: 'spectator', role: 'spectator' });
    });

    socketRef.current.on('joined_room', () => setGameState('watching'));

    socketRef.current.on('new_question', (data) => {
      setCurrentQuestion(data);
      setGameState('watching');
    });

    socketRef.current.on('round_results', (data) => {
      if (data.player1) setScores(prev => ({ ...prev, player1: data.player1.total_score }));
      if (data.player2) setScores(prev => ({ ...prev, player2: data.player2.total_score }));
    });

    socketRef.current.on('game_end', (data) => {
      setFinalResult(data);
      setGameState('finished');
    });

    axios.get(`${BACKEND_URL}/api/duo/${matchId}`, { withCredentials: true })
      .then(res => setMatchData(res.data))
      .catch(() => {});

    return () => { if (socketRef.current) socketRef.current.disconnect(); };
  }, [matchId]);

  if (gameState === 'connecting') {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #1E3A8A 0%, #312E81 50%, #1E3A8A 100%)' }}>
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-yellow-400 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-white text-lg">Connexion au match...</p>
        </div>
      </div>
    );
  }

  if (gameState === 'finished' && finalResult) {
    const isDraw = finalResult.winner === 'draw';
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #1E3A8A 0%, #312E81 50%, #1E3A8A 100%)' }}>
        <Card className="p-8 bg-white/10 backdrop-blur-md border-white/20 max-w-md w-full mx-4 text-center">
          <div className="text-6xl mb-4">{isDraw ? '🤝' : '🏆'}</div>
          <h2 className="text-3xl font-bold text-white mb-6">{isDraw ? 'Match Nul !' : 'Victoire !'}</h2>
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className={`p-4 rounded-lg ${finalResult.winner === 'player1' ? 'bg-emerald-500/20 ring-2 ring-emerald-400' : 'bg-white/5'}`}>
              <p className="text-blue-200 text-sm">{matchData?.player1_name || 'Joueur 1'}</p>
              <p className="text-3xl font-bold text-white">{finalResult.player1_score}</p>
            </div>
            <div className={`p-4 rounded-lg ${finalResult.winner === 'player2' ? 'bg-emerald-500/20 ring-2 ring-emerald-400' : 'bg-white/5'}`}>
              <p className="text-blue-200 text-sm">{matchData?.player2_name || 'Joueur 2'}</p>
              <p className="text-3xl font-bold text-white">{finalResult.player2_score}</p>
            </div>
          </div>
          <Button onClick={() => navigate('/spectate')} className="bg-white/10 border-white/20 text-white hover:bg-white/20">Retour aux matchs</Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #1E3A8A 0%, #312E81 50%, #1E3A8A 100%)' }}>
      <div className="relative z-10 container mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <Button onClick={() => navigate('/spectate')} variant="outline" className="bg-white/10 border-white/20 text-white hover:bg-white/20">
            <ArrowLeft className="w-4 h-4 mr-2" /> Quitter
          </Button>
          <span className="flex items-center gap-2 text-emerald-300 text-sm font-semibold"><Eye className="w-4 h-4" /> SPECTATEUR</span>
        </div>

        <Card className="p-6 bg-white/10 backdrop-blur-md border-white/20 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-blue-400" />
              <span className="text-white font-semibold">{matchData?.player1_name || 'Joueur 1'}</span>
            </div>
            <span className="text-yellow-400 font-bold text-2xl">{scores.player1}</span>
          </div>
          <Progress value={(scores.player1 / 2000) * 100} className="h-3 bg-blue-950 mb-3" />
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Trophy className="w-5 h-5 text-purple-400" />
              <span className="text-white font-semibold">{matchData?.player2_name || 'Joueur 2'}</span>
            </div>
            <span className="text-purple-300 font-bold text-2xl">{scores.player2}</span>
          </div>
          <Progress value={(scores.player2 / 2000) * 100} className="h-3 bg-purple-950" />
        </Card>

        {currentQuestion && (
          <motion.div key={currentQuestion.question_index} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <Card className="p-6 bg-white/10 backdrop-blur-md border-white/20">
              <p className="text-sm text-blue-200 mb-2">Question {currentQuestion.question_index + 1}/{currentQuestion.total_questions}</p>
              <h2 className="text-xl font-bold text-white mb-4">{currentQuestion.text}</h2>
              <div className="grid grid-cols-2 gap-3">
                {currentQuestion.options.map((opt, idx) => (
                  <div key={idx} className="p-3 rounded-lg bg-white/5 border border-white/10 text-white text-sm">{opt}</div>
                ))}
              </div>
            </Card>
          </motion.div>
        )}

        {!currentQuestion && gameState === 'watching' && (
          <div className="text-center py-12">
            <div className="w-12 h-12 border-4 border-yellow-400 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-blue-200">En attente de la prochaine question...</p>
          </div>
        )}
      </div>
    </div>
  );
};

export { SpectatorList, SpectatorView };
