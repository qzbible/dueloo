import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { io } from 'socket.io-client';
import axios from 'axios';
import { useTranslation } from '@/hooks/useTranslation';
import LanguageSwitcher from '@/components/LanguageSwitcher';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ArrowLeft, Users, Copy, Check, Link as LinkIcon, ShieldCheck, Plus } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

const ModeDuo = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { t } = useTranslation();
  const [mode, setMode] = useState('menu');
  const [friendCode, setFriendCode] = useState('');
  const [requestedMaxPlayers, setRequestedMaxPlayers] = useState(4);
  const [matchData, setMatchData] = useState(null);
  const [lobbyPlayers, setLobbyPlayers] = useState([]);
  const [copied, setCopied] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const socketRef = useRef(null);

  // Auto-join if code is in URL
  useEffect(() => {
    const code = searchParams.get('code');
    if (code && mode === 'menu') {
      setFriendCode(code.toUpperCase());
      // Small delay to ensure user sees the transition
      setTimeout(() => joinMatch(code.toUpperCase()), 500);
    }
  }, [searchParams]);

  useEffect(() => {
    return () => {
      if (socketRef.current) socketRef.current.disconnect();
    };
  }, []);

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
        navigate(`/play/ludo`, { 
          state: { 
            duelData: { 
              matchId: mId, 
              role, 
              userId: uId,
              max_players: matchData?.max_players || 2
            } 
          } 
        });
      }, 1500);
    });
  };

  const createMatch = async () => {
    try {
      // Default to ludo for this request or provide a way to select
      const response = await axios.post(`${BACKEND_URL}/api/duo/matchmaking`, { 
        mode: 'friend',
        mode_id: 'ludo',
        max_players: requestedMaxPlayers
      }, { withCredentials: true });
      
      const data = response.data;

      setMatchData(data);
      setMode('waiting');
      
      // Initialize with host
      setLobbyPlayers([{
          role: data.role,
          name: 'Vous',
          user_id: data.user_id
      }]);

      setupSocket(data.match_id, data.role, data.user_id);
    } catch (error) {
      console.error('Erreur:', error);
    }
  };

  const copyInviteLink = () => {
    if (!matchData) return;
    const link = `${window.location.origin}/duo?code=${matchData.friend_code}`;
    navigator.clipboard.writeText(link);
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 2000);
  };

  const copySlotLink = (slotRole) => {
    if (!matchData) return;
    const link = `${window.location.origin}/duo?code=${matchData.friend_code}&requested_role=${slotRole}`;
    navigator.clipboard.writeText(link);
    // Visual feedback
    alert(`Lien pour ${slotRole} copié !`);
  };

  const joinMatch = async (codeOverride = null) => {
    const code = codeOverride || friendCode;
    const requestedRole = searchParams.get('requested_role');
    if (!code) return;
    try {
      const response = await axios.post(`${BACKEND_URL}/api/duo/matchmaking`, { 
        mode: 'friend', 
        friend_code: code,
        requested_role: requestedRole
      }, { withCredentials: true });
      
      const data = response.data;
      setMatchData(data);
      setMode('waiting');
      
      setupSocket(data.match_id, data.role, data.user_id);
    } catch (error) {
      console.error('[ModeDuo] Join error:', error);
      alert(error.response?.data?.detail || "Impossible de rejoindre");
    }
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
  };

  if (mode === 'waiting') {
    const maxP = matchData?.max_players || 2;

    return (

      <div className="min-h-screen relative overflow-hidden flex items-center justify-center bg-slate-950">
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_50%,_rgba(30,58,138,0.5),_transparent_70%)]" />
        </div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-4xl w-full mx-4 z-10">
          <Card className="p-8 bg-slate-900/50 backdrop-blur-2xl border-white/10 shadow-2xl rounded-[2.5rem]">
            <div className="flex flex-col md:flex-row gap-8">
              
              {/* Left: Info & Code */}
              <div className="flex-1 space-y-6 text-center md:text-left">
                <div>
                   <div className="flex items-center gap-2 justify-center md:justify-start mb-2">
                      <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center">
                        <ShieldCheck className="w-5 h-5 text-blue-400" />
                      </div>
                      <span className="text-xs font-black text-blue-400 uppercase tracking-widest">Partie Privée</span>
                   </div>
                   <h2 className="text-3xl font-black text-white">Prêt pour le duel ?</h2>
                   <p className="text-slate-400 text-sm mt-1">Invitez jusqu'à {maxP - 1} amis pour commencer le match.</p>

                </div>

                <div className="space-y-3">
                   <div className="bg-white/5 rounded-2xl p-4 border border-white/5 group transition-all hover:border-white/10">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter">Code de la salle</span>
                        <button onClick={copyCode} className="text-[10px] font-bold text-blue-400 hover:text-blue-300 transition-colors uppercase">Copier</button>
                      </div>
                      <div className="text-4xl font-black text-yellow-400 tracking-[0.3em] font-mono">{matchData?.friend_code}</div>
                   </div>

                   <Button 
                    onClick={copyInviteLink}
                    className="w-full bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-xl h-12 gap-2"
                   >
                     {linkCopied ? <Check className="w-4 h-4 text-emerald-400" /> : <LinkIcon className="w-4 h-4 text-slate-400" />}
                     {linkCopied ? 'Lien copié !' : 'Copier le lien d\'invitation'}
                   </Button>
                </div>

                <Button onClick={() => window.location.reload()} variant="ghost" className="text-slate-500 hover:text-white hover:bg-white/5 rounded-xl">
                  Annuler la partie
                </Button>
              </div>

              {/* Right: Lobby Slots */}
              <div className="w-full md:w-80 space-y-3">
                <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 px-1">Joueurs ({lobbyPlayers.length}/{maxP})</div>
                <div className="grid grid-cols-1 gap-2 border-b border-white/5 pb-4">
                                    {[...Array(maxP)].map((_, i) => {
                                        const roleNum = i + 1;
                                        const slotRole = `player${roleNum}`;
                                        const player = lobbyPlayers.find(p => p.role === slotRole);
                                        return (
                                            <motion.div 
                                                key={i}
                                                layout
                                                className={`h-16 rounded-2xl border flex items-center px-4 gap-3 transition-all duration-500
                                                    ${player ? 'bg-blue-600/20 border-blue-500/30' : 'bg-white/5 border-dashed border-white/10'}`}
                                            >
                                                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-black text-sm
                                                    ${player ? 'bg-blue-500 text-white' : 'bg-slate-800 text-slate-600'}`}>
                                                    {player ? (player.name?.charAt(0).toUpperCase()) : roleNum}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    {(() => {
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
                                                      return <div className={`text-[10px] font-black uppercase tracking-widest ${colorClass[i]}`}>{colorMap[i]}</div>;
                                                    })()}
                                                    <div className={`text-sm font-black truncate ${player ? 'text-white' : 'text-slate-600 italic'}`}>
                                                        {player ? (player.user_id === matchData?.user_id ? 'Vous' : player.name) : 'En attente...'}
                                                    </div>
                                                </div>
                                                {player ? (
                                                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                                ) : (
                                                  <button 
                                                    onClick={() => copySlotLink(slotRole)}
                                                    className="w-10 h-10 rounded-xl bg-blue-500/10 hover:bg-blue-500/30 border border-blue-500/20 flex items-center justify-center transition-all group/btn hover:scale-110 active:scale-95"
                                                    title={`Inviter le Joueur ${roleNum}`}
                                                  >
                                                    <Plus className="w-5 h-5 text-blue-400 group-hover/btn:text-white transition-colors" />
                                                  </button>
                                                )}
                                            </motion.div>
                                        );
                                    })}
                </div>


                {matchData?.role === 'player1' && (
                  <Button 
                    onClick={handleStartMatch}
                    disabled={lobbyPlayers.length < maxP}
                    className="w-full h-14 bg-emerald-600 hover:bg-emerald-500 text-white font-black rounded-2xl shadow-lg shadow-emerald-500/20 disabled:opacity-50 transition-all uppercase tracking-widest text-base"
                  >
                    Lancez la partie
                  </Button>
                )}

                
                {lobbyPlayers.length < 4 && (
                  <div className="mt-4 p-3 rounded-xl bg-blue-500/5 border border-blue-500/10 flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-blue-500 animate-ping" />
                    <span className="text-[10px] font-medium text-blue-300/80">Recherche d'adversaires...</span>
                  </div>
                )}
              </div>
            </div>
          </Card>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative overflow-hidden bg-slate-950">
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-20 left-10 w-72 h-72 bg-blue-600 rounded-full blur-[120px]" />
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-purple-600 rounded-full blur-[150px]" />
      </div>
      
      <div className="relative z-10 container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <Button onClick={() => navigate('/games')} variant="outline" className="bg-white/5 backdrop-blur-md border-white/10 text-white hover:bg-white/10 rounded-xl px-4">
            <ArrowLeft className="w-4 h-4 mr-2" />{t('common.back')}
          </Button>
          <LanguageSwitcher />
        </div>

        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-12">
          <h1 className="text-4xl sm:text-6xl font-black text-white mb-4 tracking-tighter uppercase italic" style={{ fontFamily: 'Fraunces, serif' }}>
            Bible<span className="text-blue-500">Duel</span> <span className="text-xs bg-blue-500 text-white px-2 py-1 rounded-full align-middle ml-2">PRO</span>
          </h1>
          <p className="text-lg text-slate-400 max-w-lg mx-auto leading-relaxed">{t('duo.subtitle')}</p>
          
          <div className="flex gap-4 justify-center mt-8">
            <Button onClick={() => navigate('/duo/history')} variant="ghost" className="text-slate-400 hover:text-white hover:bg-white/5 rounded-xl border border-white/5">Historique</Button>
            <Button onClick={() => navigate('/duo/leaderboard')} variant="ghost" className="text-slate-400 hover:text-white hover:bg-white/5 rounded-xl border border-white/5">Classement</Button>
          </div>
        </motion.div>

        <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto items-stretch">
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }}>
            <Card className="p-10 bg-white/5 backdrop-blur-3xl border-white/10 h-full rounded-[2.5rem] flex flex-col items-center text-center group transition-all hover:bg-white/10">
              <div className="w-20 h-20 rounded-[2rem] bg-gradient-to-br from-blue-400 to-blue-700 flex items-center justify-center mb-6 shadow-2xl shadow-blue-500/20 group-hover:scale-110 transition-transform">
                <Users className="w-10 h-10 text-white" />
              </div>
              <h3 className="text-3xl font-black text-white mb-4">Créer une salle</h3>
              <p className="text-slate-400 mb-6 flex-1">{t('duo.create_desc')}</p>
              
              <div className="w-full mb-6">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3 block">Nombre de joueurs</label>
                <div className="flex gap-2 p-1 bg-black/20 rounded-xl">
                  {[2, 3, 4].map(num => (
                    <button
                      key={num}
                      onClick={() => setRequestedMaxPlayers(num)}
                      className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${requestedMaxPlayers === num ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 hover:text-white hover:bg-white/5'}`}
                    >
                      {num}
                    </button>
                  ))}
                </div>
              </div>

              <Button onClick={createMatch} className="w-full h-14 bg-blue-600 hover:bg-blue-500 text-white font-black text-lg rounded-2xl shadow-lg shadow-blue-600/30">Lancer l'invitation</Button>
            </Card>
          </motion.div>

          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }}>
            <Card className="p-10 bg-white/5 backdrop-blur-3xl border-white/10 h-full rounded-[2.5rem] flex flex-col items-center group transition-all hover:bg-white/10">
              <div className="w-20 h-20 rounded-[2rem] bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center mb-6 shadow-2xl shadow-emerald-500/20 group-hover:scale-110 transition-transform">
                <Users className="w-10 h-10 text-white" />
              </div>
              <h3 className="text-3xl font-black text-white mb-4 text-center">Rejoindre</h3>
              <p className="text-slate-400 mb-8 text-center flex-1">{t('duo.join_desc')}</p>
              
              <div className="w-full space-y-4">
                <div className="relative">
                  <Input 
                    value={friendCode} 
                    onChange={(e) => setFriendCode(e.target.value.toUpperCase())} 
                    placeholder="CODE" 
                    className="h-14 text-center text-3xl font-black tracking-[0.4em] bg-black/40 border-white/10 text-blue-400 rounded-2xl" 
                    maxLength={6} 
                  />
                  {friendCode.length === 6 && <div className="absolute right-4 top-4 w-6 h-6 rounded-full bg-emerald-500/20 flex items-center justify-center"><Check className="w-4 h-4 text-emerald-500" /></div>}
                </div>
                <Button onClick={() => joinMatch()} className="w-full h-14 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-lg rounded-2xl shadow-lg shadow-emerald-600/30">Entrer dans la salle</Button>
              </div>
            </Card>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default ModeDuo;

