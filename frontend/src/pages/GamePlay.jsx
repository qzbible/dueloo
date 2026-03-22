import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import Confetti from 'react-confetti';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ArrowLeft, Trophy } from 'lucide-react';

import QuiADitQuoi from '@/components/games/QuiADitQuoi';
import VraiFaux from '@/components/games/VraiFaux';
import ChronoVersets from '@/components/games/ChronoVersets';
import MotsCaches from '@/components/games/MotsCaches';
import Anagrammes from '@/components/games/Anagrammes';
import MemoryBiblique from '@/components/games/MemoryBiblique';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

const GamePlay = () => {
  const navigate = useNavigate();
  const { modeId } = useParams();
  
  const [loading, setLoading] = useState(true);
  const [gameSession, setGameSession] = useState(null);
  const [gameMode, setGameMode] = useState(null);
  const [result, setResult] = useState(null);
  const [showConfetti, setShowConfetti] = useState(false);

  useEffect(() => {
    startGame();
  }, [modeId]);

  const startGame = async () => {
    try {
      const response = await axios.post(
        `${BACKEND_URL}/api/games/start`,
        { mode_id: modeId },
        { withCredentials: true }
      );
      
      setGameSession(response.data.session_id);
      setGameMode(response.data.mode);
      setLoading(false);
    } catch (error) {
      console.error('Erreur démarrage jeu:', error);
      alert('Erreur lors du démarrage du jeu');
      navigate('/games');
    }
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
      'memory_biblique': MemoryBiblique
    };

    const GameComponent = gameComponents[modeId];
    
    if (!GameComponent) {
      return (
        <div className="text-center py-12">
          <p className="text-white text-lg">Ce jeu n'est pas encore implémenté</p>
          <Button onClick={() => navigate('/games')} className="mt-4">
            Retour aux modes
          </Button>
        </div>
      );
    }

    return <GameComponent onSubmit={handleSubmit} />;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-900 to-purple-900">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-yellow-400 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-white text-lg">Chargement du jeu...</p>
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
              {result.score >= 3 ? 'Excellent !' : 'Bien joué !'}
            </h2>
            
            <div className="mb-8">
              <div data-testid="game-score" className="text-6xl font-bold text-yellow-400 mb-2">
                {result.score}
              </div>
              <div className="text-blue-200">Points marqués</div>
              <div className="text-sm text-blue-300 mt-2">
                +{result.xp_gained} XP • +{result.coins_earned} 🪙
              </div>
            </div>
            
            <div className="space-y-3">
              <Button
                onClick={() => window.location.reload()}
                className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white"
              >
                Rejouer
              </Button>
              <Button
                onClick={() => navigate('/games')}
                variant="outline"
                className="w-full bg-white/10 backdrop-blur-md border-white/20 text-white hover:bg-white/20"
              >
                Autres modes
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
        <Button
          onClick={() => navigate('/games')}
          variant="outline"
          className="bg-white/10 backdrop-blur-md border-white/20 text-white hover:bg-white/20 mb-6"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Quitter
        </Button>

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
