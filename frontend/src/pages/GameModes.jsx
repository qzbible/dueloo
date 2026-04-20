import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import { useTranslation } from '@/hooks/useTranslation';
import LanguageSwitcher from '@/components/LanguageSwitcher';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, Play, Lock, Clock, Trophy, Eye, Star, Zap, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

const GameModes = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [gameModes, setGameModes] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchGameModes();
  }, []);

  const fetchGameModes = async () => {
    try {
      const response = await axios.get(`${BACKEND_URL}/api/game-modes`, {
        withCredentials: true
      });
      setGameModes(response.data);
    } catch (error) {
      console.error('Erreur chargement modes:', error);
    } finally {
      setLoading(false);
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a0b1e]">
        <div className="relative">
          <div className="w-24 h-24 border-8 border-yellow-500/20 border-t-yellow-500 rounded-full animate-spin"></div>
          <div className="absolute inset-0 flex items-center justify-center">
            <Star className="w-8 h-8 text-yellow-500 animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative overflow-hidden bg-[#0a0b1e] pb-20">
      {/* Background Orbs */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] bg-blue-900/10 rounded-full blur-[150px]" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] bg-purple-900/10 rounded-full blur-[150px]" />
      </div>

      <div className="relative z-10 container mx-auto px-6 pt-12">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-16">
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
            <Button
              onClick={() => navigate('/dashboard')}
              variant="ghost"
              className="text-blue-200 hover:text-white hover:bg-white/10 mb-6 group transition-all"
            >
              <ArrowLeft className="w-5 h-5 mr-2 group-hover:-translate-x-1 transition-transform" />
              {t('common.back')}
            </Button>
            <h1 className="text-5xl md:text-6xl font-black text-white mb-4 tracking-tight">
              {t('games.title')} <span className="text-gradient">BibleQuest</span>
            </h1>
            <p className="text-xl text-blue-100/60 max-w-xl font-medium">
              {t('games.subtitle')}
            </p>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, x: 20 }} 
            animate={{ opacity: 1, x: 0 }}
            className="flex flex-wrap gap-4 items-center"
          >
            <Button onClick={() => navigate('/tournaments')} className="glass-dark border-yellow-500/30 text-yellow-100 hover:bg-yellow-500/20">
              <Trophy className="w-5 h-5 mr-2 text-yellow-400" /> {t('games.tournaments')}
            </Button>
            <Button onClick={() => navigate('/spectate')} className="glass-dark border-emerald-500/30 text-emerald-100 hover:bg-emerald-500/20">
              <Eye className="w-5 h-5 mr-2 text-emerald-400" /> {t('games.spectator')}
            </Button>
            <LanguageSwitcher />
          </motion.div>
        </div>

        <div className="flex flex-col md:flex-row gap-6 mb-12 items-start md:items-center justify-between">
          <Tabs defaultValue="all" className="w-full md:w-auto overflow-x-auto" onValueChange={setSelectedCategory}>
            <div className="glass-dark p-1.5 rounded-2xl inline-flex min-w-max">
              <TabsList className="bg-transparent gap-2 flex-nowrap">
                {['all', 'Quiz et Tests', 'Jeux de Mots', 'Strategie et Plateau', 'Cartes', 'Arcade et Action', 'Éducatif', 'Rapidité', 'Logique', 'Défis Flash'].map((cat) => (
                  <TabsTrigger 
                    key={cat} 
                    value={cat} 
                    className="rounded-xl px-4 py-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-600 data-[state=active]:to-indigo-600 data-[state=active]:text-white transition-all text-blue-100/60 whitespace-nowrap"
                  >
                    {cat === 'all' ? t('games.all') : cat}
                  </TabsTrigger>
                ))}
              </TabsList>
            </div>
          </Tabs>

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

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
          <AnimatePresence mode="popLayout">
            {filteredModes.map((mode, index) => (
              <motion.div
                key={mode.mode_id}
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.3, delay: index * 0.05 }}
              >
                <Card className={`group relative p-8 glass hover:bg-white/15 border-white/5 transition-all duration-500 h-full flex flex-col overflow-hidden ${
                  !mode.available && 'opacity-60 grayscale'
                }`}>
                  {/* Decorative Elements */}
                  <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${mode.color} opacity-0 group-hover:opacity-10 blur-2xl transition-opacity`} />
                  
                  <div className="flex items-start justify-between mb-8 relative z-10">
                    <div className={`text-4xl w-16 h-16 rounded-2xl bg-gradient-to-br ${mode.color} flex items-center justify-center shadow-lg transform group-hover:scale-110 group-hover:rotate-3 transition-transform duration-300`}>
                      <span className="drop-shadow-md">{mode.icon}</span>
                    </div>
                    {!mode.available ? (
                      <div className="glass p-2 rounded-xl">
                        <Lock className="w-5 h-5 text-yellow-400" />
                      </div>
                    ) : (
                      <div className="glass p-2 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity">
                        <Zap className="w-5 h-5 text-blue-400" />
                      </div>
                    )}
                  </div>

                  <h3 className="text-2xl font-black text-white mb-3 group-hover:text-blue-100 transition-colors relative z-10">
                    {mode.name}
                  </h3>

                  <p className="text-blue-100/60 mb-8 flex-grow leading-relaxed font-medium relative z-10">
                    {mode.description}
                  </p>

                  <div className="flex items-center justify-between text-sm text-blue-200/80 mb-8 relative z-10">
                    <span className="px-3 py-1.5 rounded-xl glass-dark font-bold text-xs uppercase tracking-wider border-white/5">
                      {mode.difficulty}
                    </span>
                    <span className="flex items-center gap-2 font-bold">
                      <Clock className="w-4 h-4 text-blue-400" />
                      {mode.duration_minutes}m
                    </span>
                  </div>

                  <Button
                    onClick={() => mode.available && startGame(mode.mode_id)}
                    disabled={!mode.available}
                    className={`w-full h-14 rounded-xl font-black text-lg shadow-xl relative z-10 transition-all duration-300 
                      ${mode.available 
                        ? `bg-gradient-to-br ${mode.color} hover:brightness-110 hover:scale-[1.02] active:scale-95 text-white` 
                        : 'bg-white/5 text-white/20'}`}
                  >
                    {mode.available ? (
                      <span className="flex items-center gap-2">
                        <Play className="fill-current w-5 h-5" /> {t('common.play') || 'Jouer'}
                      </span>
                    ) : (
                      'Bientôt'
                    )}
                  </Button>
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {filteredModes.length === 0 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-32 glass rounded-3xl mt-12">
            <div className="text-blue-200/40 text-6xl mb-6">∅</div>
            <p className="text-blue-200/60 text-xl font-medium">Aucun mode disponible dans cette catégorie</p>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default GameModes;

