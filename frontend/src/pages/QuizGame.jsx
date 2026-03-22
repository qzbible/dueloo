import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import Confetti from 'react-confetti';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { ArrowLeft, Heart, Trophy, CheckCircle, XCircle } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

const QuizGame = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const book = searchParams.get('book') || 'Genèse';
  const { user, setUser } = useAuthStore();
  
  const [questions, setQuestions] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [gameEnded, setGameEnded] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showConfetti, setShowConfetti] = useState(false);

  useEffect(() => {
    fetchQuestions();
  }, []);

  const fetchQuestions = async () => {
    try {
      const response = await axios.get(
        `${BACKEND_URL}/api/questions/random?book=${book}&limit=5`,
        { withCredentials: true }
      );
      
      if (response.data.length === 0) {
        alert('Aucune question disponible pour ce livre');
        navigate('/campaign');
        return;
      }
      
      setQuestions(response.data);
    } catch (error) {
      console.error('Erreur chargement questions:', error);
      alert('Erreur lors du chargement des questions');
      navigate('/campaign');
    } finally {
      setLoading(false);
    }
  };

  const handleAnswer = (answerIndex) => {
    if (showFeedback) return;
    
    setSelectedAnswer(answerIndex);
    const correct = answerIndex === currentQuestion.correct_answer;
    setIsCorrect(correct);
    
    if (correct) {
      setScore(score + 1);
    }
    
    setShowFeedback(true);
    
    setTimeout(() => {
      if (currentIndex < questions.length - 1) {
        setCurrentIndex(currentIndex + 1);
        setSelectedAnswer(null);
        setShowFeedback(false);
      } else {
        finishGame(correct ? score + 1 : score);
      }
    }, 2000);
  };

  const finishGame = async (finalScore) => {
    setGameEnded(true);
    
    if (finalScore >= 3) {
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 5000);
    }
    
    try {
      const response = await axios.post(
        `${BACKEND_URL}/api/progress/update?book=${book}&score=${finalScore}&completed=true`,
        {},
        { withCredentials: true }
      );
      
      const userResponse = await axios.get(`${BACKEND_URL}/api/auth/me`, { withCredentials: true });
      setUser(userResponse.data);
    } catch (error) {
      console.error('Erreur mise à jour progression:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-900 to-purple-900">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-yellow-400 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-white text-lg">Chargement des questions...</p>
        </div>
      </div>
    );
  }

  if (questions.length === 0) {
    return null;
  }

  const currentQuestion = questions[currentIndex];
  const progress = ((currentIndex + 1) / questions.length) * 100;

  if (gameEnded) {
    const passed = score >= 3;
    
    return (
      <div className="min-h-screen relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #1E3A8A 0%, #312E81 50%, #1E3A8A 100%)' }}>
        {showConfetti && <Confetti recycle={false} numberOfPieces={500} />}
        
        <div className="relative z-10 container mx-auto px-4 py-8 flex items-center justify-center min-h-screen">
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="max-w-md w-full"
          >
            <Card className="p-8 bg-white/10 backdrop-blur-md border-white/20 text-center">
              <div className={`w-24 h-24 rounded-full mx-auto mb-6 flex items-center justify-center ${
                passed ? 'bg-gradient-to-br from-emerald-400 to-emerald-600' : 'bg-gradient-to-br from-orange-400 to-orange-600'
              }`}>
                {passed ? (
                  <Trophy className="w-12 h-12 text-white" />
                ) : (
                  <Heart className="w-12 h-12 text-white" />
                )}
              </div>
              
              <h2 data-testid="quiz-result-title" className="text-3xl font-bold text-white mb-4" style={{ fontFamily: 'Fraunces, serif' }}>
                {passed ? 'Félicitations !' : 'Continuez !'}
              </h2>
              
              <p className="text-blue-200 mb-6" style={{ fontFamily: 'Manrope, sans-serif' }}>
                {passed 
                  ? 'Vous avez réussi ce niveau !' 
                  : 'Réessayez pour améliorer votre score'}
              </p>
              
              <div className="mb-8">
                <div data-testid="quiz-score" className="text-6xl font-bold text-yellow-400 mb-2">
                  {score}/{questions.length}
                </div>
                <div className="text-blue-200">Questions correctes</div>
              </div>
              
              <div className="space-y-3">
                <Button
                  data-testid="play-again-button"
                  onClick={() => window.location.reload()}
                  className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white"
                >
                  Rejouer
                </Button>
                <Button
                  data-testid="back-to-campaign-button"
                  onClick={() => navigate('/campaign')}
                  variant="outline"
                  className="w-full bg-white/10 backdrop-blur-md border-white/20 text-white hover:bg-white/20"
                >
                  Retour à la campagne
                </Button>
              </div>
            </Card>
          </motion.div>
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
        <div className="mb-6">
          <Button
            onClick={() => navigate('/campaign')}
            variant="outline"
            className="bg-white/10 backdrop-blur-md border-white/20 text-white hover:bg-white/20 mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Quitter
          </Button>
          
          <div className="flex items-center justify-between mb-2">
            <span className="text-white font-semibold">Question {currentIndex + 1}/{questions.length}</span>
            <div className="flex items-center gap-2">
              <Heart className="w-5 h-5 text-red-400" />
              <span className="text-white font-semibold">{user?.lives}</span>
            </div>
          </div>
          <Progress value={progress} className="h-2 bg-blue-950" />
        </div>

        <div className="max-w-3xl mx-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentIndex}
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              transition={{ duration: 0.3 }}
            >
              <Card className="p-8 bg-white/10 backdrop-blur-md border-white/20 mb-6">
                <div className="mb-2 text-sm text-blue-200">{currentQuestion.book}</div>
                <h2 data-testid="question-text" className="text-2xl font-bold text-white mb-8" style={{ fontFamily: 'Manrope, sans-serif' }}>
                  {currentQuestion.text}
                </h2>
                
                <div className="space-y-3">
                  {currentQuestion.options.map((option, index) => (
                    <motion.button
                      key={index}
                      data-testid={`answer-option-${index}`}
                      whileHover={{ scale: showFeedback ? 1 : 1.02 }}
                      whileTap={{ scale: showFeedback ? 1 : 0.98 }}
                      onClick={() => handleAnswer(index)}
                      disabled={showFeedback}
                      className={`w-full p-4 rounded-xl text-left font-medium transition-all ${
                        showFeedback
                          ? index === currentQuestion.correct_answer
                            ? 'bg-emerald-500/30 border-2 border-emerald-400 text-white'
                            : index === selectedAnswer
                            ? 'bg-red-500/30 border-2 border-red-400 text-white'
                            : 'bg-white/5 border border-white/10 text-white/50'
                          : 'bg-white/10 border border-white/20 text-white hover:bg-white/20'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span>{option}</span>
                        {showFeedback && (
                          <>
                            {index === currentQuestion.correct_answer && (
                              <CheckCircle className="w-6 h-6 text-emerald-400" />
                            )}
                            {index === selectedAnswer && index !== currentQuestion.correct_answer && (
                              <XCircle className="w-6 h-6 text-red-400" />
                            )}
                          </>
                        )}
                      </div>
                    </motion.button>
                  ))}
                </div>
                
                {showFeedback && currentQuestion.explanation && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-6 p-4 rounded-lg bg-blue-500/20 border border-blue-400/30"
                  >
                    <p className="text-blue-100 text-sm">{currentQuestion.explanation}</p>
                  </motion.div>
                )}
              </Card>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};

export default QuizGame;
