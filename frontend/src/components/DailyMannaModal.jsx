import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Sparkles, X } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

const DailyMannaModal = ({ onClose, onComplete }) => {
  const [answered, setAnswered] = useState(false);
  const [reward, setReward] = useState(null);

  const question = {
    text: "Qui a dit : 'Je suis le chemin, la vérité et la vie' ?",
    options: ["Pierre", "Jésus", "Jean", "Paul"],
    correct: 1
  };

  const handleAnswer = async (index) => {
    if (answered) return;
    
    const correct = index === question.correct;
    const coins = correct ? 10 : 5;
    
    try {
      const response = await axios.post(
        `${BACKEND_URL}/api/daily-manna?coins=${coins}`,
        {},
        { withCredentials: true }
      );
      
      setReward({ coins, streak: response.data.streak });
      setAnswered(true);
      
      setTimeout(() => {
        onComplete();
        onClose();
      }, 3000);
    } catch (error) {
      console.error('Erreur Daily Manna:', error);
      alert(error.response?.data?.detail || 'Une erreur est survenue');
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
      >
        <Card className="max-w-md w-full p-8 bg-gradient-to-br from-blue-900 to-purple-900 border-2 border-yellow-400 relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-white/60 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="text-center mb-6">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-yellow-400 to-yellow-600 flex items-center justify-center mx-auto mb-4">
              <Sparkles className="w-10 h-10 text-white" />
            </div>
            <h3 className="text-2xl font-bold text-white mb-2" style={{ fontFamily: 'Fraunces, serif' }}>
              La Manne Quotidienne
            </h3>
            <p className="text-blue-200">Répondez pour gagner des pièces !</p>
          </div>

          {!answered ? (
            <>
              <p className="text-white text-lg mb-6 text-center">{question.text}</p>
              
              <div className="space-y-3">
                {question.options.map((option, index) => (
                  <Button
                    key={index}
                    onClick={() => handleAnswer(index)}
                    className="w-full bg-white/10 backdrop-blur-md border border-white/20 text-white hover:bg-white/20"
                  >
                    {option}
                  </Button>
                ))}
              </div>
            </>
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center"
            >
              <div className="text-6xl font-bold text-yellow-400 mb-4">
                +{reward?.coins} 🪙
              </div>
              <p className="text-white text-lg mb-2">Bravo !</p>
              <p className="text-blue-200">Série : {reward?.streak} jours</p>
            </motion.div>
          )}
        </Card>
      </motion.div>
    </div>
  );
};

export default DailyMannaModal;
