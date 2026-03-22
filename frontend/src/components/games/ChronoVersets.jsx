import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import axios from 'axios';
import { Timer } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

const ChronoVersets = ({ onSubmit }) => {
  const [gameData, setGameData] = useState(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [currentAnswer, setCurrentAnswer] = useState('');
  const [timeLeft, setTimeLeft] = useState(30);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchGameData();
  }, []);

  useEffect(() => {
    if (!loading && timeLeft > 0) {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
      return () => clearTimeout(timer);
    } else if (timeLeft === 0) {
      handleNext();
    }
  }, [timeLeft, loading]);

  const fetchGameData = async () => {
    try {
      const response = await axios.post(
        `${BACKEND_URL}/api/games/start`,
        { mode_id: 'chrono_versets' },
        { withCredentials: true }
      );
      setGameData(response.data.game_data);
    } catch (error) {
      console.error('Erreur:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleNext = () => {
    const newAnswers = { ...answers, [`q_${currentIndex}`]: currentAnswer };
    setAnswers(newAnswers);
    setCurrentAnswer('');
    setTimeLeft(30);
    
    if (currentIndex < gameData.verses.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      onSubmit(newAnswers);
    }
  };

  if (loading || !gameData) {
    return <div className="text-center text-white">Chargement...</div>;
  }

  const currentVerse = gameData.verses[currentIndex];
  const displayText = currentVerse.text.replace(currentVerse.missing, '______');

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <span className="text-yellow-400 font-semibold">
          Verset {currentIndex + 1}/{gameData.verses.length}
        </span>
        <div className="flex items-center gap-2 text-white">
          <Timer className="w-5 h-5" />
          <span className={`text-xl font-bold ${timeLeft <= 10 ? 'text-red-400' : 'text-white'}`}>
            {timeLeft}s
          </span>
        </div>
      </div>

      <Card className="p-8 bg-white/10 backdrop-blur-md border-white/20 mb-6">
        <p className="text-2xl text-white mb-4 text-center">
          {displayText}
        </p>
        <p className="text-blue-200 text-center text-sm">{currentVerse.reference}</p>
      </Card>

      <div className="space-y-4">
        <Input
          data-testid="verse-input"
          value={currentAnswer}
          onChange={(e) => setCurrentAnswer(e.target.value)}
          placeholder="Complétez le verset..."
          className="text-lg p-6 bg-white/10 backdrop-blur-md border-white/20 text-white placeholder:text-blue-300"
          onKeyPress={(e) => e.key === 'Enter' && handleNext()}
          autoFocus
        />
        <Button
          onClick={handleNext}
          className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white"
        >
          Valider
        </Button>
      </div>
    </div>
  );
};

export default ChronoVersets;
