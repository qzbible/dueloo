import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import axios from 'axios';
import { Check, X } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

const VraiFaux = ({ onSubmit, duelMode, opponentMove, onMove, bothReady }) => {
  const [gameData, setGameData] = useState(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [loading, setLoading] = useState(true);

  React.useEffect(() => {
    if (duelMode) {
      if (bothReady && duelMode.role === 'player1') {
        fetchGameData();
      }
    } else {
      fetchGameData();
    }
  }, [bothReady]);

  React.useEffect(() => {
    if (duelMode && opponentMove) {
      if (opponentMove.type === 'init' && duelMode.role === 'player2') {
        setGameData(opponentMove.gameData);
        setLoading(false);
      }
    }
  }, [opponentMove]);

  const fetchGameData = async () => {
    try {
      const response = await axios.post(
        `${BACKEND_URL}/api/games/start`,
        { mode_id: 'quiz_vrai_faux' },
        { withCredentials: true }
      );
      setGameData(response.data.game_data);
      if (duelMode && duelMode.role === 'player1') {
        onMove({ type: 'init', gameData: response.data.game_data });
      }
    } catch (error) {
      console.error('Erreur:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAnswer = (answer) => {
    setAnswers({ ...answers, [`q_${currentIndex}`]: answer });
    
    if (currentIndex < gameData.statements.length - 1) {
      setTimeout(() => {
        setCurrentIndex(currentIndex + 1);
        if (duelMode) onMove({ type: 'progress', index: currentIndex + 1 });
      }, 400);
    } else {
      setTimeout(() => onSubmit({ ...answers, [`q_${currentIndex}`]: answer }), 400);
    }
  };

  if (loading || !gameData) {
    return <div className="text-center text-white">Chargement...</div>;
  }

  const currentStatement = gameData.statements[currentIndex];

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6 text-center flex justify-center gap-8">
        <span className="text-yellow-400 font-semibold">
          Vous: {currentIndex + 1}/{gameData.statements.length}
        </span>
        {duelMode && (
          <span className="text-emerald-400 font-semibold">
            Adversaire: {(opponentMove?.type === 'progress' ? opponentMove.index : (opponentMove?.type === 'init' ? 0 : 0)) + 1}/{gameData.statements.length}
          </span>
        )}
      </div>

      <motion.div
        key={currentIndex}
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
      >
        <Card className="p-8 bg-white/10 backdrop-blur-md border-white/20 mb-8 text-center">
          <p className="text-2xl text-white">
            {currentStatement.text}
          </p>
        </Card>

        <div className="grid grid-cols-2 gap-6">
          <Button
            data-testid="btn-vrai"
            onClick={() => handleAnswer(true)}
            className="p-8 bg-gradient-to-br from-emerald-400 to-emerald-600 hover:from-emerald-500 hover:to-emerald-700 text-white text-xl"
          >
            <Check className="w-8 h-8 mr-2" />
            VRAI
          </Button>
          <Button
            data-testid="btn-faux"
            onClick={() => handleAnswer(false)}
            className="p-8 bg-gradient-to-br from-red-400 to-red-600 hover:from-red-500 hover:to-red-700 text-white text-xl"
          >
            <X className="w-8 h-8 mr-2" />
            FAUX
          </Button>
        </div>
      </motion.div>
    </div>
  );
};

export default VraiFaux;
