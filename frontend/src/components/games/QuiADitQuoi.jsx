import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

const QuiADitQuoi = ({ onSubmit, duelMode, opponentMove, onMove, bothReady }) => {
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
        { mode_id: 'quiz_qui_a_dit' },
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
    
    if (currentIndex < gameData.quotes.length - 1) {
      setTimeout(() => {
        setCurrentIndex(currentIndex + 1);
        if (duelMode) onMove({ type: 'progress', index: currentIndex + 1 });
      }, 500);
    } else {
      setTimeout(() => onSubmit({ ...answers, [`q_${currentIndex}`]: answer }), 500);
    }
  };

  if (loading || !gameData) {
    return <div className="text-center text-white">Chargement...</div>;
  }

  const currentQuote = gameData.quotes[currentIndex];

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-6 text-center flex justify-center gap-8">
        <span className="text-yellow-400 font-semibold">
          Vous: {currentIndex + 1}/{gameData.quotes.length}
        </span>
        {duelMode && (
          <span className="text-emerald-400 font-semibold">
            Adversaire: {(opponentMove?.type === 'progress' ? opponentMove.index : (opponentMove?.type === 'init' ? 0 : 0)) + 1}/{gameData.quotes.length}
          </span>
        )}
      </div>

      <motion.div
        key={currentIndex}
        initial={{ opacity: 0, x: 50 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -50 }}
      >
        <Card className="p-8 bg-white/10 backdrop-blur-md border-white/20 mb-6">
          <p className="text-2xl text-white mb-2 text-center italic">
            "{currentQuote.text}"
          </p>
          <p className="text-blue-200 text-center text-sm">Qui a dit cela ?</p>
        </Card>

        <div className="grid grid-cols-2 gap-4">
          {currentQuote.options.map((option, index) => (
            <Button
              key={index}
              data-testid={`option-${index}`}
              onClick={() => handleAnswer(option)}
              className="p-6 text-lg bg-white/10 backdrop-blur-md border border-white/20 text-white hover:bg-white/20"
            >
              {option}
            </Button>
          ))}
        </div>
      </motion.div>
    </div>
  );
};

export default QuiADitQuoi;
