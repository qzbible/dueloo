import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from '@/hooks/useTranslation';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ArrowLeft, Play, Users, Cpu, Clock, Zap, Settings2, Copy, Check, Link as LinkIcon, ShieldCheck, Plus } from 'lucide-react';
import { io } from 'socket.io-client';


const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

const GameConfig = () => {
  const { modeId } = useParams();
  const navigate = useNavigate();
  const { t, lang } = useTranslation();
  const [mode, setMode] = useState(null);
  const [config, setConfig] = useState({
    mode: 'duel',
    level: 'beginner',
    opponent: 'ia',
    time: 'none',
    specifics: {
      max_players: modeId === 'ludo' ? 4 : 2
    }
  });

  const [waitingMatch, setWaitingMatch] = useState(false);
  const [matchData, setMatchData] = useState(null);
  const [copied, setCopied] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const [lobbyPlayers, setLobbyPlayers] = useState([]);
  const socketRef = useRef(null);


  useEffect(() => {
    fetchMode();
  }, [modeId]);

  const fetchMode = async () => {
    try {
      const response = await axios.get(`${BACKEND_URL}/api/game-modes`, {
        params: { mode_id: modeId },
        withCredentials: true
      });
      const m = response.data.find(m => m.mode_id === modeId);
      setMode(m);
    } catch (error) {
      console.error('Error fetching mode:', error);
    }
  };

  const startGame = async () => {
    if (config.opponent === 'ia') {
      navigate(`/play/${modeId}`, { state: { config } });
    } else {
      // Duel matchmaking (Friend or Random)
      try {
        const maxPlayers = config.specifics?.max_players ?? (modeId === 'ludo' ? 4 : 2);
        const response = await axios.post(`${BACKEND_URL}/api/duo/matchmaking`, { 
          mode: config.opponent === 'friend' ? 'friend' : 'random',
          mode_id: modeId,
          max_players: maxPlayers
        }, { withCredentials: true });
        
        const data = response.data;
        setMatchData(data);
        setWaitingMatch(true);
        setLobbyPlayers([{
          role: data.role,
          name: 'Vous',
          user_id: data.user_id
        }]);
        setupSocket(data.match_id, data.role, data.user_id);

      } catch (error) {
        console.error('Matchmaking error:', error);
      }
    }
  };

  const setupSocket = (mId, role, uId) => {
    if (socketRef.current) socketRef.current.disconnect();

    socketRef.current = io(BACKEND_URL, {
      path: '/api/socket.io',
      transports: ['websocket']
    });

    socketRef.current.on('connect', () => {
      socketRef.current.emit('join_duo_room', {
        match_id: mId,
        user_id: uId,
        role: role
      });
    });

    socketRef.current.on('joined_room', (data) => {
    });

    socketRef.current.on('lobby_update', (data) => {
      setLobbyPlayers(data.players);
      if (data.max_players) {
        setMatchData(prev => ({ ...prev, max_players: data.max_players }));
      }
    });


    socketRef.current.on('both_ready', () => {
      setTimeout(() => {
        if (socketRef.current) socketRef.current.disconnect();
        navigate(`/play/${modeId}`, { 
          state: { 
            config, 
            duelData: { 
              matchId: mId, 
              role, 
              userId: uId,
              max_players: matchData?.max_players || config.specifics?.max_players || 2
            } 
          } 
        });
      }, 1000);
    });
  };

  const handleStartMatch = () => {
    if (socketRef.current && matchData) {
      socketRef.current.emit('force_start_match', { match_id: matchData.match_id });
    }
  };


  const copyCode = () => {
    navigator.clipboard.writeText(matchData.friend_code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };  const copyLink = () => {
    const link = `${window.location.origin}/play/${modeId}?code=${matchData.friend_code}`;
    navigator.clipboard.writeText(link);
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 2000);
  };

  const copySlotLink = (slotRole) => {
    if (!matchData) return;
    const link = `${window.location.origin}/play/${modeId}?code=${matchData.friend_code}&requested_role=${slotRole}`;
    navigator.clipboard.writeText(link);
    alert(`Lien pour ${slotRole} copié !`);
  };

  if (!mode) return null;

  return (
    <div className="min-h-screen bg-[#0a0b1e] text-white p-6 pb-20 overflow-hidden relative">
      <div className="absolute inset-0 pointer-events-none">
        <div className={`absolute top-0 right-0 w-64 h-64 bg-gradient-to-br ${mode.color} opacity-10 blur-[100px]`} />
      </div>

      <div className="container mx-auto max-w-4xl relative z-10">
        <Button onClick={() => navigate('/games')} variant="ghost" className="text-blue-200 mb-8 group">
          <ArrowLeft className="w-5 h-5 mr-2 group-hover:-translate-x-1" /> Retour
        </Button>

        <div className="grid md:grid-cols-[1fr_2fr] gap-12">
          {/* Mode Card Preview */}
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
             <Card className="p-8 glass-dark border-white/5 h-fit text-center">
                <div className={`text-6xl w-24 h-24 rounded-3xl bg-gradient-to-br ${mode.color} mx-auto mb-6 flex items-center justify-center shadow-2xl`}>
                    {mode.icon}
                </div>
                <h1 className="text-3xl font-black mb-4">{mode.name}</h1>
                <p className="text-blue-100/60 leading-relaxed italic">{mode.description}</p>
             </Card>
          </motion.div>

          {/* Configuration Form */}
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-12">
            <section>
                <div className="flex items-center gap-3 mb-6">
                    <Settings2 className="w-6 h-6 text-blue-400" />
                    <h2 className="text-2xl font-black uppercase tracking-wider">Configuration de la partie</h2>
                </div>

                <div className="grid gap-8">
                    {/* Common Parameters */}
                    <div>
                        <label className="text-sm font-bold text-blue-200/50 uppercase mb-4 block">Mode de jeu</label>
                        <div className="grid grid-cols-2 gap-4">
                            {['duel', 'multi'].map(m => (
                                <button key={m} onClick={() => setConfig({...config, mode: m})} className={`p-4 rounded-xl glass-dark border-2 transition-all ${config.mode === m ? 'border-blue-500 bg-blue-500/10' : 'border-white/5'}`}>
                                    <div className="flex flex-col items-center gap-2">
                                        <Users className="w-6 h-6" />
                                        <span className="font-bold capitalize">{m === 'duel' ? 'Duel (1v1)' : 'Multijoueur'}</span>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>

                    <div>
                        <label className="text-sm font-bold text-blue-200/50 uppercase mb-4 block">Niveau</label>
                        <div className="flex gap-2 bg-white/5 p-1.5 rounded-2xl">
                            {['beginner', 'intermediate', 'expert'].map(l => (
                                <button key={l} onClick={() => setConfig({...config, level: l})} className={`flex-1 py-3 rounded-xl font-bold transition-all ${config.level === l ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'text-blue-100/40 hover:text-white'}`}>
                                    {l === 'beginner' ? 'Débutant' : l === 'intermediate' ? 'Intermédiaire' : 'Expert'}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div>
                        <label className="text-sm font-bold text-blue-200/50 uppercase mb-4 block">Adversaire</label>
                        <div className="grid grid-cols-3 gap-3 text-sm">
                            {[
                                { id: 'ia', icon: Cpu, label: 'IA' },
                                { id: 'friend', icon: Users, label: 'Ami' },
                                { id: 'random', icon: Zap, label: 'Aléatoire' }
                            ].map(opt => (
                                <button key={opt.id} onClick={() => setConfig({...config, opponent: opt.id})} className={`p-3 rounded-xl glass-dark border transition-all flex items-center gap-2 justify-center ${config.opponent === opt.id ? 'border-emerald-500 text-emerald-400 bg-emerald-500/5' : 'border-white/5 text-blue-100/40'}`}>
                                    <opt.icon className="w-4 h-4" />
                                    <span className="font-bold">{opt.label}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {modeId === 'ludo' && config.mode === 'multi' && (
                        <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                            <label className="text-sm font-bold text-blue-200/50 uppercase mb-4 block text-center">Nombre de joueurs</label>
                            <div className="flex gap-4 bg-white/5 p-2 rounded-2xl border border-white/5">
                                {[2, 3, 4].map(num => (
                                    <button 
                                        key={num} 
                                        onClick={() => setConfig({...config, specifics: {...config.specifics, max_players: num}})}
                                        className={`flex-1 py-4 rounded-xl font-black text-lg transition-all ${config.specifics.max_players === num || (!config.specifics.max_players && num === 4) ? 'bg-gradient-to-br from-blue-500 to-purple-600 text-white shadow-lg' : 'text-blue-100/40 hover:bg-white/5'}`}
                                    >
                                        {num}
                                    </button>
                                ))}
                            </div>
                            <p className="text-[10px] text-blue-200/40 mt-3 text-center italic">Les couleurs seront attribuées dans l'ordre : Rouge, Vert, Jaune, Bleu.</p>
                        </div>
                    )}

                    <div>
                        <label className="text-sm font-bold text-blue-200/50 uppercase mb-4 block">Temps de réflexion</label>
                        <select 
                            value={config.time} 
                            onChange={(e) => setConfig({...config, time: e.target.value})}
                            className="w-full bg-white/5 border border-white/5 rounded-xl px-4 py-3 text-white font-bold outline-none focus:border-blue-500/50 transition-colors"
                        >
                            <option value="none" className="bg-[#0a0b1e]">Sans limite</option>
                            <option value="10" className="bg-[#0a0b1e]">Par coup : 10s</option>
                            <option value="30" className="bg-[#0a0b1e]">Par coup : 30s</option>
                            <option value="60" className="bg-[#0a0b1e]">Par coup : 1m</option>
                        </select>
                    </div>

                    {/* Logic for specific mode parameters would go here */}
                    {modeId === 'echecs' && (
                        <div>
                             <label className="text-sm font-bold text-blue-200/50 uppercase mb-4 block">Format d'échecs</label>
                             <div className="flex gap-2">
                                {['Blitz', 'Rapid', 'Classic'].map(f => (
                                    <button onClick={() => setConfig({...config, specifics: {...config.specifics, format: f}})} className={`flex-1 py-3 rounded-xl font-bold border ${config.specifics.format === f ? 'bg-amber-600 border-amber-500' : 'bg-white/5 border-white/5'}`}>{f}</button>
                                ))}
                             </div>
                        </div>
                    )}
                </div>
            </section>

            <Button onClick={startGame} className={`w-full h-16 rounded-2xl font-black text-xl shadow-2xl bg-gradient-to-br ${mode.color} hover:brightness-110 transform active:scale-[0.98] transition-all`}>
                <Play className="fill-current mr-2 w-6 h-6" /> COMMENCER !
            </Button>
          </motion.div>
        </div>
      </div>

      <AnimatePresence>
        {waitingMatch && (
            <motion.div 
                initial={{ opacity: 0 }} 
                animate={{ opacity: 1 }} 
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[100] bg-slate-950/95 backdrop-blur-3xl flex items-center justify-center p-4"
            >
                <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} className="max-w-2xl w-full">
                    <Card className="p-8 bg-slate-900/50 border-white/10 shadow-2xl rounded-[2.5rem] relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-blue-500 animate-pulse" />
                        
                        <div className="flex flex-col md:flex-row gap-8">
                            {/* Invitation Section */}
                            <div className="flex-1 space-y-6">
                                <div>
                                    <div className="flex items-center gap-2 mb-2">
                                        <ShieldCheck className="w-5 h-5 text-blue-400" />
                                        <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest italic">BibleDuel PRO Match</span>
                                    </div>
                                    <h2 className="text-3xl font-black text-white leading-tight">En attente des joueurs</h2>
                                    <p className="text-slate-400 text-sm">Partagez l'invitation pour commencer le duel.</p>
                                </div>

                                <div className="space-y-3">
                                    <div className="bg-white/5 rounded-2xl p-4 border border-white/5">
                                        <div className="flex justify-between items-center mb-1 text-[10px] font-bold text-slate-500 uppercase">Code de la salle</div>
                                        <div className="text-3xl font-black text-yellow-500 tracking-[0.2em] font-mono">{matchData?.friend_code}</div>
                                    </div>
                                    
                                    <Button 
                                        onClick={copyLink} 
                                        className="w-full h-12 bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/20 text-blue-400 rounded-xl gap-2 font-bold"
                                    >
                                        <LinkIcon className="w-4 h-4" /> Copier le lien d'invitation
                                    </Button>
                                    
                                    <Button 
                                        onClick={() => {
                                            if (socketRef.current) socketRef.current.disconnect();
                                            setWaitingMatch(false);
                                        }} 
                                        variant="ghost" 
                                        className="w-full text-slate-500 hover:text-white"
                                    >
                                        Annuler
                                    </Button>
                                </div>
                            </div>

                            {/* Lobby Slots */}
                            <div className="w-full md:w-64 space-y-3">
                                <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Lobby ({lobbyPlayers.length}/{matchData?.max_players || 2})</div>
                                <div className="grid gap-2">
                                    {[...Array(matchData?.max_players || 2)].map((_, i) => {
                                        const roleNum = i + 1;
                                        const slotRole = `player${roleNum}`;
                                        const player = lobbyPlayers.find(p => p.role === slotRole);
                                        const maxP = matchData?.max_players || 2;
                                        // Color label for each slot
                                        const colorMap = maxP === 2
                                          ? ['Rouge','Bleu']
                                          : maxP === 3
                                          ? ['Rouge','Bleu','Vert']
                                          : ['Rouge','Vert','Jaune','Bleu'];
                                        const colorClass = maxP === 2
                                          ? ['text-red-400','text-blue-400']
                                          : maxP === 3
                                          ? ['text-red-400','text-blue-400','text-green-400']
                                          : ['text-red-400','text-green-400','text-yellow-400','text-blue-400'];
                                        return (
                                            <div key={i} className={`h-14 rounded-xl border flex items-center px-4 gap-3 transition-all ${player ? 'bg-white/10 border-white/20' : 'bg-white/5 border-dashed border-white/10'}`}>
                                                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-xs ${player ? 'bg-blue-500 text-white' : 'bg-slate-800 text-slate-600'}`}>
                                                    {player ? player.name[0].toUpperCase() : roleNum}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                  <div className={`text-[10px] font-black uppercase tracking-widest ${colorClass[i]}`}>{colorMap[i]}</div>
                                                  <div className="text-sm font-black truncate text-white">
                                                      {player ? (player.user_id === matchData?.user_id ? 'Vous' : player.name) : 'En attente...'}
                                                  </div>
                                                </div>
                                                {player ? (
                                                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                                ) : (
                                                  <button 
                                                    onClick={() => copySlotLink(slotRole)}
                                                    className="w-8 h-8 rounded-lg bg-blue-500/10 hover:bg-blue-500/30 border border-blue-500/20 flex items-center justify-center transition-all group/btn"
                                                    title={`Inviter le Joueur ${roleNum}`}
                                                  >
                                                    <Plus className="w-4 h-4 text-blue-400 group-hover/btn:text-white" />
                                                  </button>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>

                                {matchData?.role === 'player1' && (
                                    <Button 
                                        onClick={handleStartMatch}
                                        disabled={lobbyPlayers.length < (matchData?.max_players || 2)}
                                        className="w-full h-12 bg-emerald-600 hover:bg-emerald-500 text-white font-black rounded-xl mt-4 shadow-lg shadow-emerald-600/20 disabled:opacity-50"
                                    >
                                        Lancez la partie
                                    </Button>
                                )}
                            </div>
                        </div>
                    </Card>
                </motion.div>
            </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
};

export default GameConfig;
