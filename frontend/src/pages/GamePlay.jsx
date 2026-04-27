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
  const [opponentMoveQueue, setOpponentMoveQueue] = useState([]);
  const [bothReady, setBothReady] = useState(false);
  const [voiceChatKey, setVoiceChatKey] = useState(0);
  const [spectatorCount, setSpectatorCount] = useState(0);
  const initGuardRef = useRef(false); // Prevent double-init (React StrictMode)

  useEffect(() => {
    initGuardRef.current = false; // Reset guard on modeId change
    initGame();

    const handleRestart = () => {
      console.log("Forcing WebRTC Restart...");
      setVoiceChatKey(prev => prev + 1);
    };
    window.addEventListener('force_webrtc_restart', handleRestart);
    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      window.removeEventListener('force_webrtc_restart', handleRestart);
    };
  }, [modeId]);

  const initGame = async () => {
    const queryParams = new URLSearchParams(window.location.search);
    const joinCode = queryParams.get('code');
    const requestedRole = queryParams.get('requested_role');
    const urlMatchId = queryParams.get('match');

    try {
      if (joinCode) {
        // Guard against React StrictMode double-invoke
        if (initGuardRef.current) {
        }
        initGuardRef.current = true;

        // Auto-join from friend link
        const response = await axios.post(`${BACKEND_URL}/api/duo/matchmaking`, { 
          mode: 'friend', 
          friend_code: joinCode,
          mode_id: modeId,
          requested_role: requestedRole
        }, { withCredentials: true });
        
        const dData = { 
          matchId: response.data.match_id, 
          role: response.data.role,           // e.g. 'player3' — MUST be preserved
          userId: response.data.user_id,
          max_players: response.data.max_players || 2,
          mode_id: modeId,
          gameData: response.data.current_state  // nested, not spread
        };
        
        
        // Save FIRST to localStorage BEFORE rewriting URL
        saveDuelSession(dData);
        
        // Rewrite URL (drops code param — recovery will use localStorage)
        const newUrl = window.location.pathname + `?match=${dData.matchId}`;
        window.history.replaceState({ ...state, duelData: dData }, '', newUrl);

        setDuelMode(dData);
        setupSocket(dData);
        startGame(dData);
      } else {
        // Try recovery from: 1) Route state, 2) LocalStorage (saved right before URL rewrite), 3) API
        let dData = state?.duelData;
        
        // LocalStorage is checked FIRST because it's saved with the correct role
        // (the API would return the role based on DB user_id which could be wrong
        //  if the same user has multiple tabs open)
        if (!dData && !state?.config) {
           const saved = localStorage.getItem('active_duel');
           if (saved) {
             try {
               const parsed = JSON.parse(saved);
               // Only use if it matches the URL's match param
               if (!urlMatchId || urlMatchId === parsed.matchId) {
                  dData = parsed;
               }
             } catch(e) { /* ignore corrupt storage */ }
           }
        }
        
        // FAST PATH: If match ID is in URL, connect socket immediately as spectator
        // CRITICAL: Overwrite role if it's explicitly requested OR if we are on the /spectate route
        const isSpectateRoute = window.location.pathname.includes('/spectate');
        if (urlMatchId && (!dData || requestedRole === 'spectator' || isSpectateRoute)) {
           dData = { 
             matchId: urlMatchId, 
             role: 'spectator', 
             userId: dData?.userId || ('anon_' + Math.random().toString(36).substr(2, 5)) 
           };
        }

        if (dData) {
          saveDuelSession(dData);
          setDuelMode(dData);
          // If it's a spectator, setupSocket will trigger spectate_match and get the state
          setupSocket(dData, true);
          
          if (dData.role !== 'spectator') {
            // For players, we might still want to fetch initial state context to avoid UI flicker
            // But for Ludo, startGame will fetch it.
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
      if (dData.role === 'spectator') {
        socketRef.current.emit('spectate_match', {
          match_id: dData.matchId,
          user_id: dData.userId
        });
      } else {
        const event = isRejoining ? 'rejoin_duo_room' : 'join_duo_room';
        socketRef.current.emit(event, {
          match_id: dData.matchId,
          user_id: dData.userId,
          role: dData.role
        });
      }
    });

    socketRef.current.on('spectator_joined', (data) => {
      console.log('[Socket][GamePlay] spectator_joined:', data);
      const mId = data.current_state?.mode_id || dData.mode_id || modeId;
      const recoveredData = {
        ...dData,
        mode_id: mId,
        gameData: data.current_state?.game_data || data.current_state,
        likes: data.likes,
        comments: data.comments
      };
      setDuelMode(recoveredData);
      startGame(recoveredData, recoveredData.gameData);
    });

    socketRef.current.on('joined_room', (data) => {
    });

    socketRef.current.on('player_rejoined', (data) => {
    });

    socketRef.current.on('opponent_move', (data) => {
      console.log('[Socket][GamePlay] opponent_move received:', data);
      setOpponentMove(data);
      setOpponentMoveQueue(prev => [...prev, data]);
    });

    socketRef.current.on('both_ready', () => {
      setBothReady(true);
    });

    socketRef.current.on('game_start', (data) => {
      setDuelMode(prev => ({
        ...prev,
        gameData: data.game_data
      }));
    });

    socketRef.current.on('spectator_count', (data) => {
      console.log('[Socket][GamePlay] spectator_count:', data.count);
      setSpectatorCount(data.count);
    });

    socketRef.current.on('opponent_disconnected', (data) => {
      console.log('[Socket][GamePlay] opponent_disconnected:', data);
      toast.info("Un joueur s'est déconnecté de la partie.");
    });

    socketRef.current.on('like_update', (data) => {
      setOpponentMoveQueue(prev => [...prev, { ...data, type: 'social_like' }]);
    });

    socketRef.current.on('new_comment', (data) => {
      setOpponentMoveQueue(prev => [...prev, { ...data, type: 'social_comment' }]);
    });

    socketRef.current.on('new_reaction', (data) => {
      setOpponentMoveQueue(prev => [...prev, { type: 'social_reaction', ...data }]);
    });
  };

  const onPlayerMove = (moveData) => {
    if (duelMode && socketRef.current) {
        const mId = duelMode.matchId || duelMode.gameData?.match_id;
        console.log('[Socket][GamePlay] Sending move/social to match:', mId, moveData.type);
        
        if (moveData.type === 'game_like') {
            socketRef.current.emit('game_like', { match_id: mId, ...moveData });
        } else if (moveData.type === 'game_comment') {
            socketRef.current.emit('game_comment', { match_id: mId, ...moveData });
        } else {
            socketRef.current.emit('game_move', { match_id: mId, ...moveData });
        }
    }
  };

  const startGame = async (dData = null, recovered = null) => {
    try {
      setOpponentMoveQueue([]); // Flush ghosts from previous games
      
      let sessionRes = { data: { session_id: null, match_id: dData?.matchId, game_data: recovered } };
      let modeRes = gameMode;
      if (dData?.role === 'spectator') {
        // SPECTATOR: Get mode metadata only, skip creating/starting a game session
        const mId = dData?.mode_id || modeId;
        modeRes = mId ? await db_get_mode(mId) : null;
      } else {
        // PLAYER: Normal start/resume
        const [sRes, mRes] = await Promise.all([
          axios.post(
            `${BACKEND_URL}/api/games/start`,
            { 
              mode_id: modeId, 
              lang,
              config: {
                ...(state?.config || (dData ? { opponent: 'human' } : {})),
                match_id: dData?.matchId || state?.config?.match_id,
                max_players: dData?.max_players  // Pass max_players to session
              },
            },
            { withCredentials: true }
          ),
          db_get_mode(modeId)
        ]);
        sessionRes = sRes;
        modeRes = mRes;
      }
      
      setGameSession(sessionRes.data.session_id);

      const matchId = sessionRes.data.match_id;

      if (dData && dData.matchId) {
        saveDuelSession(dData, sessionRes.data.session_id);
        setDuelMode(prev => {
          const base = {
            ...prev,
            matchId: dData.matchId,
            role: dData.role,
            userId: dData.userId,
            max_players: dData.max_players || prev?.max_players || 2,
            mode_id: dData.mode_id || modeId,
            config: state?.config
          };
          // Only update gameData if sessionRes actually has it, otherwise preserve socket-provided data
          if (sessionRes.data.game_data) {
            base.gameData = sessionRes.data.game_data;
          } else if (recovered) {
            base.gameData = recovered;
          }
          return base;
        });
      } else if (matchId) {
        // Solo/AI game with Live Spectator support
        const soloData = {
          matchId: matchId,
          role: 'player1',
          userId: 'solo_player',
          config: state?.config || { opponent: 'ia' },
          gameData: sessionRes.data.game_data
        };
        saveDuelSession(soloData, sessionRes.data.session_id);
        setDuelMode(soloData);
        setBothReady(true);
        // ONLY setup socket if not already spectating
        if (!socketRef.current) {
          setupSocket(soloData);
        }
      } else {
        setBothReady(true);
        // Ensure we DON'T have a matchId if it's AI mode
        setDuelMode({ 
          config: state?.config || { opponent: 'ia' },
          gameData: sessionRes.data.game_data
        });
      }

      if (recovered) {
        setDuelMode(prev => ({ ...prev, recovered }));
      }

      setGameMode(modeRes);
      setLoading(false);
    } catch (error) {
      console.error('Erreur démarrage jeu:', error);
      toast.error('Erreur lors du démarrage du jeu');
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
      
      setResult({ ...response.data, gameContext: answers });
      localStorage.removeItem('active_duel');
      
      if (response.data.score >= 3) {
        setShowConfetti(true);
        setTimeout(() => setShowConfetti(false), 5000);
      }
    } catch (error) {
      console.error('Erreur soumission:', error);
      toast.error('Erreur lors de la soumission');
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
        onSubmit={(answers) => handleSubmit({ ...answers, modeId })} 
        duelMode={duelMode}
        gameData={duelMode?.gameData || gameMode?.game_data}
        opponentMove={opponentMove}
        opponentMoveQueue={opponentMoveQueue}
        onMove={onPlayerMove}
        bothReady={bothReady}
        isSpectator={duelMode?.role === 'spectator'}
      />
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0f172a]" style={{ background: 'radial-gradient(circle at center, #1e293b 0%, #0f172a 100%)' }}>
        <div className="text-center">
          <div className="relative w-24 h-24 mx-auto mb-8">
            <div className="absolute inset-0 border-4 border-blue-500/20 rounded-full"></div>
            <div className="absolute inset-0 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            <div className="absolute inset-0 flex items-center justify-center">
               <Eye className="w-8 h-8 text-blue-400 animate-pulse" />
            </div>
          </div>
          <h2 className="text-2xl font-black text-white mb-2 tracking-tight">CONNEXION AU LIVE</h2>
          <p className="text-blue-400 font-medium animate-pulse flex items-center justify-center gap-2">
             <span className="w-2 h-2 bg-red-500 rounded-full"></span>
             SYNCHRONISATION TEMPS RÉEL...
          </p>
        </div>
      </div>
    );
  }

  const getVictoryMessage = () => {
    const won = result.gameContext?.won || result.score >= 3;
    if (!won) return t('games.well_played');

    const messages = {
      ludo: "Quelle endurance ! Tu as ramené tes brebis au bercail.",
      quiz_qui_a_dit: "Tu as bien sondé les Écritures !",
      quiz_vrai_faux: "La vérité n'a plus de secret pour toi.",
      chrono_versets: "Une mémoire digne des prophètes !",
      echecs: "Une victoire digne de la sagesse de Salomon !",
      damier: "Une stratégie victorieuse !",
      morpion: "La victoire est tienne !",
      puissance4: "Bien joué, champion !",
      snake: "Quelle agilité !",
    };

    return messages[modeId] || t('games.excellent');
  };

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
              result.score >= 3 || result.gameContext?.won ? 'bg-gradient-to-br from-emerald-400 to-emerald-600' : 'bg-gradient-to-br from-orange-400 to-orange-600'
            }`}>
              <Trophy className="w-12 h-12 text-white" />
            </div>
            
            <h2 className="text-2xl font-black text-white mb-4 leading-tight">
              {getVictoryMessage()}
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
                  const link = `${window.location.origin}/spectate?match=${duelMode.matchId}&requested_role=spectator`;
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
              duelMode={duelMode}
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
