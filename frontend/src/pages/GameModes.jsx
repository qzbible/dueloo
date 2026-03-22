import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, Play, Lock, Clock } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

const GameModes = () => {
  const navigate = useNavigate();
  const [gameModes, setGameModes] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchGameModes();
    fetchCategories();
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

  const fetchCategories = async () => {
    try {
      const response = await axios.get(`${BACKEND_URL}/api/game-modes/categories`);
      setCategories([{ name: 'Tous', count: response.data.reduce((sum, cat) => sum + cat.count, 0) }, ...response.data]);
    } catch (error) {
      console.error('Erreur chargement catégories:', error);
    }
  };

  const filteredModes = selectedCategory === 'all' 
    ? gameModes 
    : gameModes.filter(mode => mode.category === selectedCategory);

  const startGame = (modeId) => {
    navigate(`/play/${modeId}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-900 to-purple-900">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-yellow-400 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-white text-lg">Chargement des modes...</p>
        </div>
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
        <Button
          data-testid="back-to-dashboard"
          onClick={() => navigate('/dashboard')}
          variant="outline"
          className="bg-white/10 backdrop-blur-md border-white/20 text-white hover:bg-white/20 mb-6"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Retour
        </Button>

        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-4xl sm:text-5xl font-bold text-white mb-3" style={{ fontFamily: 'Fraunces, serif' }}>
            Modes de Jeu
          </h1>
          <p className="text-lg text-blue-200" style={{ fontFamily: 'Manrope, sans-serif' }}>
            Découvrez plus de 90 façons de vivre la Bible !
          </p>
        </motion.div>

        <Tabs defaultValue="all" className="mb-8" onValueChange={setSelectedCategory}>
          <TabsList className="bg-white/10 backdrop-blur-md border border-white/20">
            <TabsTrigger value="all" className="data-[state=active]:bg-white/20">Tous</TabsTrigger>
            <TabsTrigger value="Quiz et Tests" className="data-[state=active]:bg-white/20">Quiz</TabsTrigger>
            <TabsTrigger value="Jeux de Mots" className="data-[state=active]:bg-white/20">Mots</TabsTrigger>
            <TabsTrigger value="Rapidité" className="data-[state=active]:bg-white/20">Rapidité</TabsTrigger>
            <TabsTrigger value="Logique" className="data-[state=active]:bg-white/20">Logique</TabsTrigger>
            <TabsTrigger value="Défis Flash" className="data-[state=active]:bg-white/20">Flash</TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredModes.map((mode, index) => (
            <motion.div
              key={mode.mode_id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              data-testid={`game-mode-${mode.mode_id}`}
            >
              <Card className={`p-6 bg-white/10 backdrop-blur-md border-white/20 hover:bg-white/15 transition-all h-full flex flex-col ${
                !mode.available ? 'opacity-60' : 'cursor-pointer'
              }`}>
                <div className="flex items-start justify-between mb-4">
                  <div className={`text-4xl w-14 h-14 rounded-xl bg-gradient-to-br ${mode.color} flex items-center justify-center`}>
                    {mode.icon}
                  </div>
                  {!mode.available && (
                    <Lock className="w-5 h-5 text-yellow-400" />
                  )}
                </div>

                <h3 className="text-xl font-bold text-white mb-2" style={{ fontFamily: 'Manrope, sans-serif' }}>
                  {mode.name}
                </h3>

                <p className="text-sm text-blue-200 mb-4 flex-grow">
                  {mode.description}
                </p>

                <div className="flex items-center justify-between text-xs text-blue-300 mb-4">
                  <span className="px-2 py-1 rounded-full bg-white/10">
                    {mode.difficulty}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {mode.duration_minutes} min
                  </span>
                </div>

                <Button
                  onClick={() => mode.available && startGame(mode.mode_id)}
                  disabled={!mode.available}
                  className={`w-full bg-gradient-to-r ${mode.color} text-white hover:opacity-90`}
                  data-testid={`play-${mode.mode_id}`}
                >
                  {mode.available ? (
                    <>
                      <Play className="w-4 h-4 mr-2" />
                      Jouer
                    </>
                  ) : (
                    'Bientôt disponible'
                  )}
                </Button>
              </Card>
            </motion.div>
          ))}
        </div>

        {filteredModes.length === 0 && (
          <div className="text-center py-12">
            <p className="text-blue-200 text-lg">Aucun mode dans cette catégorie pour le moment</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default GameModes;
