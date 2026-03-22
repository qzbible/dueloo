import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

const Anagrammes = ({ onSubmit }) => {
  const [gameData, setGameData] = useState(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [currentAnswer, setCurrentAnswer] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchGameData();
  }, []);

  const fetchGameData = async () => {
    try {
      const response = await axios.post(
        `${BACKEND_URL}/api/games/start`,
        { mode_id: 'anagrammes' },
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
    
    if (currentIndex < gameData.anagrams.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      onSubmit(newAnswers);
    }
  };

  if (loading || !gameData) {
    return <div className="text-center text-white">Chargement...</div>;
  }

  const currentAnagram = gameData.anagrams[currentIndex];

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6 text-center">
        <span className="text-yellow-400 font-semibold">
          {currentIndex + 1}/{gameData.anagrams.length}
        </span>
      </div>

      <Card className="p-8 bg-white/10 backdrop-blur-md border-white/20 mb-6 text-center">
        <p className="text-sm text-blue-200 mb-4">Reconstituez le nom du personnage</p>
        <p className="text-5xl font-bold text-yellow-400 tracking-widest mb-4">
          {currentAnagram.scrambled}
        </p>
      </Card>

      <div className="space-y-4">
        <Input
          value={currentAnswer}
          onChange={(e) => setCurrentAnswer(e.target.value.toUpperCase())}
          placeholder="Votre réponse..."
          className="text-lg p-6 bg-white/10 backdrop-blur-md border-white/20 text-white placeholder:text-blue-300 text-center"
          onKeyPress={(e) => e.key === 'Enter' && handleNext()}
          autoFocus
        />
        <Button
          onClick={handleNext}
          className="w-full bg-gradient-to-r from-pink-400 to-pink-600 hover:from-pink-500 hover:to-pink-700 text-white"
        >
          Valider
        </Button>
      </div>
    </div>
  );
};

export default Anagrammes;
