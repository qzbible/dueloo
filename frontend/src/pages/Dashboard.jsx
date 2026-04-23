import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import { useAuthStore } from '@/stores/authStore';
import { useTranslation } from '@/hooks/useTranslation';
import LanguageSwitcher from '@/components/LanguageSwitcher';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Sparkles, Trophy, Heart, Coins, Crown, BookOpen, Award, Zap, LogOut, Shield, ChevronRight, Play, Lock, Clock, Eye, Search } from 'lucide-react';
import { io } from 'socket.io-client';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8000';

const Dashboard = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { user, setUser, clearUser } = useAuthStore();
  const [badges, setBadges] = useState([]);
  const [gameModes, setGameModes] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => { 
    const init = async () => {
      if (!user) {
        await fetchUserData();
      } else {
        setLoading(false);
      }
      await fetchGameModes();
    };

    init();

    const socket = io(BACKEND_URL, { path: '/api/socket.io', transports: ['websocket'] });
    socket.on('game_mode_updated', (updatedMode) => {
      setGameModes(prev => prev.map(m => m.mode_id === updatedMode.mode_id ? { ...m, ...updatedMode } : m));
    });

    return () => socket.disconnect();
  }, []);

  const fetchUserData = async () => {
    try {
      const [userRes, badgesRes] = await Promise.all([
        axios.get(`${BACKEND_URL}/api/auth/me`, { withCredentials: true }),
        axios.get(`${BACKEND_URL}/api/badges`, { withCredentials: true })
      ]);
      setUser(userRes.data);
      setBadges(badgesRes.data);
    } catch (error) {
      if (error.response?.status === 401) navigate('/');
    } finally { setLoading(false); }
  };

  const fetchGameModes = async () => {
    try {
      const response = await axios.get(`${BACKEND_URL}/api/game-modes`, { withCredentials: true });
      setGameModes(response.data);
    } catch (error) {
      console.error('Erreur chargement modes:', error);
    }
  };

  const filteredModes = gameModes.filter(mode => {
    const matchesCategory = selectedCategory === 'all' || mode.category === selectedCategory;
    const matchesSearch = mode.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          mode.description.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const startGame = (modeId) => {
    navigate(`/config/${modeId}`);
  };

  const handleLogout = async () => {
    try {
      await axios.post(`${BACKEND_URL}/api/auth/logout`, {}, { withCredentials: true });
      clearUser();
      navigate('/');
    } catch (error) { console.error(error); }
  };

  const xpForNextLevel = user ? user.level * 100 : 100;
  const xpProgress = user ? (user.xp / xpForNextLevel) * 100 : 0;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a0b1e]">
        <div className="w-16 h-16 border-4 border-yellow-500/20 border-t-yellow-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen relative bg-[#0a0b1e] text-blue-100/90 pb-20">
      {/* Background Orbs */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-[-10%] right-[-5%] w-[40%] h-[40%] bg-blue-600/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] left-[-5%] w-[40%] h-[40%] bg-purple-600/10 rounded-full blur-[120px]" />
      </div>

      {/* Sticky Header */}
      <header className="sticky top-0 z-50 glass border-b border-white/5 backdrop-blur-xl">
        <div className="container mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-3 group cursor-pointer" onClick={() => navigate('/profile')}>
              <div className="relative">
                <img src={user?.picture || 'https://via.placeholder.com/40'} alt={user?.name} className="w-10 h-10 rounded-xl border-2 border-white/10 object-cover shadow-lg group-hover:border-blue-500 transition-all" />
                {user?.is_premium && <Crown className="absolute -top-1.5 -right-1.5 w-4 h-4 text-yellow-400 drop-shadow-md" />}
              </div>
              <div className="hidden sm:block">
                <p className="text-sm font-black text-white leading-none">{user?.name}</p>
                <p className="text-[10px] font-bold text-blue-400/60 uppercase tracking-widest mt-1">Explorateur en herbe</p>
              </div>
            </div>

            <div className="h-8 w-px bg-white/5" />

            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-yellow-500/10 border border-yellow-500/20">
              <Coins className="w-4 h-4 text-yellow-500" />
              <span className="text-sm font-black text-white tabular-nums">{user?.coins || 0}</span>
            </div>

            <Button 
              onClick={() => navigate('/spectate')} 
              className="bg-emerald-500 text-white hover:bg-emerald-600 font-black text-xs px-4 h-9 rounded-xl shadow-lg shadow-emerald-500/20"
            >
              <Eye className="w-3.5 h-3.5 mr-2" /> {t('landing.watch_live') || 'Regarder le Live'}
            </Button>
          </div>

          <div className="flex items-center gap-3">
            <LanguageSwitcher />
            {user?.is_admin && (
              <button 
                onClick={() => navigate('/admin')} 
                className="p-2 rounded-xl bg-white/5 text-yellow-400 hover:bg-white/10 border border-white/5 transition-all"
                title="Admin Panel"
              >
                <Shield className="w-5 h-5" />
              </button>
            )}
            <button 
              onClick={handleLogout} 
              className="p-2 rounded-xl bg-white/5 text-red-400 hover:bg-white/10 border border-white/5 transition-all"
              title={t('dashboard.logout')}
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      <main className="relative z-10 container mx-auto px-6 pt-12">
        <div className="flex flex-col md:flex-row gap-6 mb-12 items-start md:items-center justify-between">
          <div>
            <h1 className="text-4xl font-black text-white mb-2 tracking-tight">Dueloo <span className="text-gradient">Exploration</span></h1>
            <p className="text-blue-100/40 font-medium">Choisissez votre prochain défi parmi plus de 90 modes de jeu.</p>
          </div>

          <div className="relative w-full md:w-72 glass-dark rounded-2xl p-1.5">
            <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-blue-400/50" />
            <Input 
              placeholder={t('common.search') || "Rechercher un jeu..."}
              className="bg-transparent border-none text-white pl-12 h-10 placeholder:text-blue-100/30 font-medium focus-visible:ring-0 focus-visible:ring-offset-0"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <Tabs defaultValue="all" className="w-full mb-12" onValueChange={setSelectedCategory}>
          <div className="overflow-x-auto pb-2 scrollbar-hide">
            <div className="glass-dark p-1.5 rounded-2xl inline-flex min-w-max border border-white/5">
              <TabsList className="bg-transparent gap-2 flex-nowrap">
                {['all', 'Quiz et Tests', 'Jeux de Mots', 'Strategie et Plateau', 'Cartes', 'Arcade et Action', 'Éducatif', 'Rapidité', 'Logique', 'Défis Flash'].map((cat) => (
                  <TabsTrigger 
                    key={cat} 
                    value={cat} 
                    className="rounded-xl px-4 py-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-600 data-[state=active]:to-indigo-600 data-[state=active]:text-white transition-all text-blue-100/60 whitespace-nowrap text-xs font-black uppercase tracking-widest"
                  >
                    {cat === 'all' ? t('games.all') : cat}
                  </TabsTrigger>
                ))}
              </TabsList>
            </div>
          </div>
        </Tabs>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          <AnimatePresence mode="popLayout">
            {filteredModes.map((mode, index) => (
              <motion.div
                key={mode.mode_id}
                layout
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.3, delay: index * 0.05 }}
              >
                <Card className={`group relative p-6 glass hover:bg-white/10 hover:translate-y-[-4px] border-white/5 transition-all duration-500 h-full flex flex-col overflow-hidden`}>
                  <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${mode.color} opacity-0 group-hover:opacity-10 blur-2xl transition-opacity`} />
                  
                  <div className="flex items-start justify-between mb-6 relative z-10">
                    <div className={`text-3xl w-14 h-14 rounded-2xl bg-gradient-to-br ${mode.color} flex items-center justify-center shadow-lg transform group-hover:scale-110 transition-transform duration-300`}>
                      <span className="drop-shadow-md">{mode.icon}</span>
                    </div>
                    <div className="glass p-2 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity"><Zap className="w-4 h-4 text-blue-400" /></div>
                  </div>

                  <h3 className="text-xl font-black text-white mb-2 group-hover:text-blue-100 transition-colors relative z-10">
                    {mode.name}
                  </h3>

                  <p className="text-xs text-blue-100/50 mb-6 flex-grow leading-relaxed font-medium relative z-10 line-clamp-2">
                    {mode.description}
                  </p>

                  <div className="flex items-center justify-between text-[10px] text-blue-200/80 mb-6 relative z-10 font-black uppercase tracking-widest">
                    <span className="px-2.5 py-1 rounded-lg bg-white/5 border border-white/5">
                      {mode.difficulty}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-blue-400" />
                      {mode.duration_minutes} min
                    </span>
                  </div>

                  <Button
                    onClick={() => startGame(mode.mode_id)}
                    className={`w-full h-12 rounded-xl font-black text-sm shadow-xl relative z-10 transition-all duration-300 
                      bg-gradient-to-br ${mode.color} hover:brightness-110 active:scale-95 text-white`}
                  >
                    <span className="flex items-center gap-2">
                      <Play className="fill-current w-4 h-4" /> Jouer
                    </span>
                  </Button>
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {filteredModes.length === 0 && (
          <div className="text-center py-32 glass rounded-3xl mt-12">
            <Search className="w-16 h-16 text-blue-200/10 mx-auto mb-4" />
            <p className="text-blue-200/40 text-xl font-bold">Aucun mode de jeu trouvé</p>
          </div>
        )}
      </main>
    </div>
  );
};

export default Dashboard;

