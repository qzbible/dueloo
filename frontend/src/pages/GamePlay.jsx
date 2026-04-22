import React, { useEffect, useState, useRef } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import Confetti from 'react-confetti';
import axios from 'axios';
import { io } from 'socket.io-client';
import { useTranslation } from '@/hooks/useTranslation';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ArrowLeft, Trophy, Copy, Eye } from 'lucide-react';
import { toast } from 'sonner';

import QuiADitQuoi from '@/components/games/QuiADitQuoi';
import VraiFaux from '@/components/games/VraiFaux';
import ChronoVersets from '@/components/games/ChronoVersets';
import MotsCaches from '@/components/games/MotsCaches';
import Anagrammes from '@/components/games/Anagrammes';
import MemoryBiblique from '@/components/games/MemoryBiblique';
import LaManne from '@/components/games/LaManne';
import TriLivres from '@/components/games/TriLivres';
import BrebisPerdue from '@/components/games/BrebisPerdue';
import MultiplierPains from '@/components/games/MultiplierPains';
import LabyrintheExode from '@/components/games/LabyrintheExode';
import TicTacToe from '@/components/games/TicTacToe';
import Connect4 from '@/components/games/Connect4';
import Snake from '@/components/games/Snake';
import Checkers from '@/components/games/Checkers';
import Ludo from '@/components/games/Ludo';
import Othello from '@/components/games/Othello';
import Mancala from '@/components/games/Mancala';
import Chess from '@/components/games/Chess';
import UNO from '@/components/games/UNO';
import Poker from '@/components/games/Poker';
import Go from '@/components/games/Go';
import Agario from '@/components/games/Agario';
import Skribbl from '@/components/games/Skribbl';
import Bataille from '@/components/games/Bataille';
import Belote from '@/components/games/Belote';
import Rami from '@/components/games/Rami';
import Course from '@/components/games/Course';
import Football from '@/components/games/Football';
import Combat from '@/components/games/Combat';
import TowerDefense from '@/components/games/TowerDefense';
import BlindTest from '@/components/games/BlindTest';
import QueSuisJe from '@/components/games/QueSuisJe';
import Fanorona from '@/components/games/Fanorona';
import Zamma from '@/components/games/Zamma';
import VoiceChat from '@/components/VoiceChat';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8000';

const GamePlay = () => {
  const navigate = useNavigate();
  const { modeId } = useParams();
  const { state } = useLocation();
  const { t, lang } = useTranslation();
  const socketRef = useRef(null);
  
  const [loading, setLoading] = useState(true);
  const [gameSession, setGameSession] = useState(null);
  const [gameMode, setGameMode] = useState(null);
  const [result, setResult] = useState(null);
  const [showConfetti, setShowConfetti] = useState(false);
  const [duelMode, setDuelMode] = useState(null); // { matchId, role, userId }
  const [opponentMove, setOpponentMove] = useState(null);
  const [bothReady, setBothReady] = useState(false);
  const [voiceChatKey, setVoiceChatKey] = useState(0);
  const [spectatorCount, setSpectatorCount] = useState(0);

  useEffect(() => {
    initGame();

    const handleRestart = () => {
      console.log("Forcing WebRTC Restart...");
      setVoiceChatKey(prev => prev + 1);
    };
    window.addEventListener('force_webrtc_restart', handleRestart);
    return () => window.removeEventListener('force_webrtc_restart', handleRestart);
  }, [modeId]);

  const initGame = async () => {
    const queryParams = new URLSearchParams(window.location.search);
    const joinCode = queryParams.get('code');
    const urlMatchId = queryParams.get('match'); // Optional URL param for recovery

    try {
      if (joinCode) {
        // Auto-join from friend link
        const response = await axios.post(`${BACKEND_URL}/api/duo/matchmaking`, { 
          mode: 'friend', 
          friend_code: joinCode 
        }, { withCredentials: true });
        
        const dData = { 
          matchId: response.data.match_id, 
          role: response.data.role, 
          userId: response.data.user_id 
        };
        // Update URL to include match ID for refresh recovery
        const newUrl = window.location.pathname + `?match=${dData.matchId}`;
        window.history.replaceState({ ...state, duelData: dData }, '', newUrl);

        saveDuelSession(dData);
        setDuelMode(dData);
        setupSocket(dData);
        startGame(dData);
      } else {
        // Try recovery from URL, State or LocalStorage
        let dData = state?.duelData;
        
        if (!dData && urlMatchId) {
          // Recovery from URL match param
          const response = await axios.get(`${BACKEND_URL}/api/duo/match/${urlMatchId}`, { withCredentials: true });
          dData = {
            matchId: response.data.match_id,
            role: response.data.role,
            userId: response.data.user_id
          };
        }

        if (!dData) {
           const saved = localStorage.getItem('active_duel');
           if (saved) {
             const parsed = JSON.parse(saved);
             // Ensure it's for this specific match if URL has it
             if (!urlMatchId || urlMatchId === parsed.matchId) {
                dData = parsed;
             }
           }
        }

        if (dData) {
          saveDuelSession(dData);
          setDuelMode(dData);
          setupSocket(dData, true);
          
          // Try to resume existing session if we have a sessionId saved
          const savedSession = dData.sessionId;
          if (savedSession) {
            try {
              const sessionRes = await axios.get(`${BACKEND_URL}/api/games/session/${savedSession}`, { withCredentials: true });
              console.log("Resuming existing session:", savedSession);
              setGameSession(savedSession);
              setDuelMode(prev => prev ? { ...prev, gameData: sessionRes.data.game_data } : dData);
              setLoading(false);
              return;
            } catch (e) {
              console.log("Session expired, starting new game.");
            }
          }
          
          // Fetch full match state and start game with recovered context
          try {
            const matchRes = await axios.get(`${BACKEND_URL}/api/duo/match/${dData.matchId}`, { withCredentials: true });
            startGame(dData, matchRes.data.current_state.game_data);
          } catch (e) {
            startGame(dData);
          }
        } else {
          startGame();
        }
      }
    } catch (e) {
      console.error("Initialization error:", e);
      startGame();
    }
  };

  const saveDuelSession = (dData, sessionId = null) => {
    if (dData) {
      const payload = { ...dData };
      if (sessionId) payload.sessionId = sessionId;
      localStorage.setItem('active_duel', JSON.stringify(payload));
    }
  };

  const setupSocket = (dData, isRejoining = false) => {
    socketRef.current = io(BACKEND_URL, {
      path: '/api/socket.io',
      transports: ['websocket', 'polling']
    });

    socketRef.current.on('connect', () => {
      console.log(`Socket connected correctly. Mode: ${isRejoining ? 'REJOIN' : 'JOIN'}`);
      const event = isRejoining ? 'rejoin_duo_room' : 'join_duo_room';
      socketRef.current.emit(event, {
        match_id: dData.matchId,
        user_id: dData.userId,
        role: dData.role
      });
    });

    socketRef.current.on('opponent_move', (data) => {
      setOpponentMove(data);
    });

    socketRef.current.on('both_ready', () => {
      setBothReady(true);
    });

    socketRef.current.on('player_rejoined', (data) => {
      console.log(`Opponent rejoined: ${data.role}`);
      // Removed setVoiceChatKey() here to prevent aggressive WebRTC tear-down
      // when the opponent's connection flaps (e.g. falling back to polling).
    });

    socketRef.current.on('spectator_count', (data) => {
      setSpectatorCount(data.count);
    });
  };

  const onPlayerMove = (moveData) => {
    if (duelMode && socketRef.current) {
        socketRef.current.emit('game_move', { match_id: duelMode.matchId, ...moveData });
    }
  };

  const startGame = async (dData = null, recovered = null) => {
    try {
      const [sessionRes, modeRes] = await Promise.all([
        axios.post(
          `${BACKEND_URL}/api/games/start`,
          { 
            mode_id: modeId, 
            lang,
            config: state?.config || (dData ? { opponent: 'human' } : {}),
          },
          { withCredentials: true }
        ),
        db_get_mode(modeId) // fetch mode metadata for display
      ]);
      
      setGameSession(sessionRes.data.session_id);
      saveDuelSession(dData, sessionRes.data.session_id);

      if (dData) {
        setDuelMode(prev => ({ ...prev, gameData: sessionRes.data.game_data }));
      }

      if (recovered) {
        setDuelMode(prev => ({ ...prev, recovered }));
      }

      setGameMode(modeRes);
      setLoading(false);
    } catch (error) {
      console.error('Erreur démarrage jeu:', error);
      alert('Erreur lors du démarrage du jeu');
      navigate('/games');
    }
  };

  const db_get_mode = async (mid) => {
    try {
      const res = await axios.get(`${BACKEND_URL}/api/game-modes`, { withCredentials: true });
      return res.data.find(m => m.mode_id === mid) || null;
    } catch { return null; }
  };

  const handleSubmit = async (answers) => {
    try {
      const response = await axios.post(
        `${BACKEND_URL}/api/games/submit`,
        {
          session_id: gameSession,
          answers: answers
        },
        { withCredentials: true }
      );
      
      setResult(response.data);
      localStorage.removeItem('active_duel');
      
      if (response.data.score >= 3) {
        setShowConfetti(true);
        setTimeout(() => setShowConfetti(false), 5000);
      }
    } catch (error) {
      console.error('Erreur soumission:', error);
      alert('Erreur lors de la soumission');
    }
  };

  const getGameComponent = () => {
    const gameComponents = {
      'quiz_qui_a_dit': QuiADitQuoi,
      'quiz_vrai_faux': VraiFaux,
      'chrono_versets': ChronoVersets,
      'mots_caches': MotsCaches,
      'anagrammes': Anagrammes,
      'memory_biblique': MemoryBiblique,
      'la_manne': LaManne,
      'tri_livres': TriLivres,
      'brebis_perdue': BrebisPerdue,
      'multiplier_pains': MultiplierPains,
      'labyrinthe_exode': LabyrintheExode,
      'morpion': TicTacToe,
      'puissance4': Connect4,
      'snake': Snake,
      'damier': Checkers,
      'ludo': Ludo,
      'othello': Othello,
      'awale': Mancala,
      'echecs': Chess,
      'uno': UNO,
      'poker': Poker,
      'go': Go,
      'agario': Agario,
      'skribbl': Skribbl,
      'bataille': Bataille,
      'belote': Belote,
      'rami': Rami,
      'course': Course,
      'football': Football,
      'combat': Combat,
      'tower_defense': TowerDefense,
      'blind_test': BlindTest,
      'que_suis_je': QueSuisJe,
      'fanorona': Fanorona,
      'zamma': Zamma
    };

    const GameComponent = gameComponents[modeId];
    
    if (!GameComponent) {
      return (
        <div className="text-center py-12">
          <p className="text-white text-lg">{t('games.not_implemented')}</p>
          <Button onClick={() => navigate('/games')} className="mt-4">
            {t('games.back_to_modes')}
          </Button>
        </div>
      );
    }

    return (
      <GameComponent 
        onSubmit={handleSubmit} 
        duelMode={duelMode}
        gameData={duelMode?.gameData || gameMode?.game_data}
        opponentMove={opponentMove}
        onMove={onPlayerMove}
        bothReady={bothReady}
      />
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-900 to-purple-900">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-yellow-400 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-white text-lg">{t('games.loading_game')}</p>
        </div>
      </div>
    );
  }

  if (result) {
    return (
      <div className="min-h-screen relative overflow-hidden flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #1E3A8A 0%, #312E81 50%, #1E3A8A 100%)' }}>
        {showConfetti && <Confetti recycle={false} numberOfPieces={500} />}
        
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md w-full mx-4"
        >
          <Card className="p-8 bg-white/10 backdrop-blur-md border-white/20 text-center">
            <div className={`w-24 h-24 rounded-full mx-auto mb-6 flex items-center justify-center ${
              result.score >= 3 ? 'bg-gradient-to-br from-emerald-400 to-emerald-600' : 'bg-gradient-to-br from-orange-400 to-orange-600'
            }`}>
              <Trophy className="w-12 h-12 text-white" />
            </div>
            
            <h2 className="text-3xl font-bold text-white mb-4" style={{ fontFamily: 'Fraunces, serif' }}>
              {result.score >= 3 ? t('games.excellent') : t('games.well_played')}
            </h2>
            
            <div className="mb-8">
              <div data-testid="game-score" className="text-6xl font-bold text-yellow-400 mb-2">
                {result.score}
              </div>
              <div className="text-blue-200">{t('games.points_scored')}</div>
              <div className="text-sm text-blue-300 mt-2">
                +{result.xp_gained} XP • +{result.coins_earned} 🪙
              </div>
            </div>
            
            <div className="space-y-3">
              <Button
                onClick={() => window.location.reload()}
                className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white"
              >
                {t('games.replay')}
              </Button>
              <Button
                onClick={() => navigate('/games')}
                variant="outline"
                className="w-full bg-white/10 backdrop-blur-md border-white/20 text-white hover:bg-white/20"
              >
                {t('games.other_modes')}
              </Button>
            </div>
          </Card>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #1E3A8A 0%, #312E81 50%, #1E3A8A 100%)' }}>
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-20 left-10 w-72 h-72 bg-yellow-400 rounded-full blur-3xl"></div>
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-purple-400 rounded-full blur-3xl"></div>
      </div>

      <div className="relative z-10 container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <Button
            onClick={() => navigate('/games')}
            variant="outline"
            className="bg-white/10 backdrop-blur-md border-white/20 text-white hover:bg-white/20"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Quitter
          </Button>

          {duelMode && (
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5 bg-white/5 px-3 py-2 rounded-lg border border-white/10 transition-all hover:bg-white/10" title="Spectateurs Live">
                 <Eye className="w-4 h-4 text-slate-400" />
                 <span className="text-sm font-bold text-slate-200">{spectatorCount}</span>
              </div>
              <Button
                onClick={() => {
                  const link = `${window.location.origin}/spectate?match=${duelMode.matchId}`;
                  navigator.clipboard.writeText(link);
                  toast.success(t('dashboard.copied') || 'Lien spectateur copié avec succès !');
                }}
                variant="outline"
                className="bg-blue-500/20 backdrop-blur-md border-blue-500/30 text-blue-300 hover:bg-blue-500/40 hover:text-white shadow-lg shadow-blue-500/10 transition-all font-bold tracking-wide"
              >
                <Copy className="w-4 h-4 mr-2" />
                Partager le Live
              </Button>
            </div>
          )}
        </div>

        {duelMode && socketRef.current && (
          <div className="flex justify-center mb-6">
            <VoiceChat 
              key={voiceChatKey}
              socket={socketRef.current} 
              matchId={duelMode.matchId} 
              role={duelMode.role} 
              userId={duelMode.userId}
            />
          </div>
        )}

        {gameMode && (
          <div className="mb-6 text-center">
            <h1 className="text-3xl font-bold text-white mb-2" style={{ fontFamily: 'Fraunces, serif' }}>
              {gameMode.name}
            </h1>
            <p className="text-blue-200">{gameMode.description}</p>
          </div>
        )}

        {getGameComponent()}
      </div>
    </div>
  );
};

export default GamePlay;
