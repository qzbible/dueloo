import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from '@/hooks/useTranslation';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ArrowLeft, Play, Users, Cpu, Clock, Zap, Settings2, Copy, Check } from 'lucide-react';

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
    specifics: {}
  });

  const [waitingMatch, setWaitingMatch] = useState(false);
  const [matchData, setMatchData] = useState(null);
  const [copied, setCopied] = useState(false);

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
        const response = await axios.post(`${BACKEND_URL}/api/duo/matchmaking`, { 
          mode: config.opponent === 'friend' ? 'friend' : 'random',
          mode_id: modeId,
          max_players: config.specifics?.max_players || 2
        }, { withCredentials: true });
        
        setMatchData(response.data);
        setWaitingMatch(true);
        startPolling(response.data.match_id, response.data.role, response.data.user_id);
      } catch (error) {
        console.error('Matchmaking error:', error);
      }
    }
  };

  const startPolling = (matchId, role, userId) => {
    const interval = setInterval(async () => {
      try {
        const response = await axios.get(`${BACKEND_URL}/api/duo/${matchId}`, { withCredentials: true });
        if (response.data.status === 'ready') {
          clearInterval(interval);
          navigate(`/play/${modeId}`, { state: { config, duelData: { matchId, role, userId } } });
        }
      } catch (error) {
        clearInterval(interval);
      }
    }, 2000);
  };

  const copyCode = () => {
    navigator.clipboard.writeText(matchData.friend_code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };  const copyLink = () => {
    const link = `${window.location.origin}/play/${modeId}?code=${matchData.friend_code}`;
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
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
                className="fixed inset-0 z-[100] bg-[#0a0b1e]/90 backdrop-blur-xl flex items-center justify-center p-6"
            >
                <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} className="max-w-md w-full">
                    <Card className="p-8 glass-dark border-white/20 text-center relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-blue-500 animate-pulse" />
                        
                        <Users className="w-16 h-16 text-blue-400 mx-auto mb-6" />
                        <h2 className="text-3xl font-black mb-4">En attente d'un ami</h2>
                        <p className="text-blue-200/60 mb-8">Partagez ce code avec votre adversaire pour qu'il rejoigne la partie.</p>
                        
                        <div className="flex flex-col gap-3">
                            <Button 
                                onClick={copyCode} 
                                className="w-full h-14 bg-white/5 border border-white/10 hover:bg-white/10 text-xl font-black rounded-xl"
                            >
                                {copied ? <Check className="w-5 h-5 mr-2 text-emerald-400" /> : <Copy className="w-5 h-5 mr-2 text-blue-400" />}
                                {matchData?.friend_code}
                            </Button>
                            
                            <Button 
                                onClick={copyLink} 
                                variant="outline" 
                                className="w-full border-blue-500/30 text-blue-400 hover:bg-blue-500/10"
                            >
                                <Users className="w-4 h-4 mr-2" /> Copier le lien d'invitation
                            </Button>
                        </div>

                        <div className="flex flex-col gap-4">
                            <div className="flex items-center justify-center gap-3 text-blue-100/40">
                                <div className="w-2 h-2 bg-blue-500 rounded-full animate-ping" />
                                <span className="font-bold text-sm uppercase tracking-widest">Recherche en cours...</span>
                            </div>
                            <Button 
                                onClick={() => setWaitingMatch(false)} 
                                variant="outline" 
                                className="border-white/10 text-white/40 hover:text-white"
                            >
                                Annuler
                            </Button>
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
