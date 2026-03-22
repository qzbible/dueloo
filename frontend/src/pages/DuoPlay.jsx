import React, { useEffect, useState, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { io } from 'socket.io-client';
import Confetti from 'react-confetti';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Trophy, Zap, Heart, Clock } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

const DuoPlay = () => {
  const navigate = useNavigate();
  const { matchId } = useParams();
  const socketRef = useRef(null);
  
  const [gameState, setGameState] = useState('connecting');
  const [matchData, setMatchData] = useState(null);
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [timeLeft, setTimeLeft] = useState(15);
  const [myScore, setMyScore] = useState(0);
  const [opponentScore, setOpponentScore] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [showResults, setShowResults] = useState(false);
  const [roundResult, setRoundResult] = useState(null);
  const [finalResult, setFinalResult] = useState(null);
  const [showConfetti, setShowConfetti] = useState(false);
  const [opponentAnswered, setOpponentAnswered] = useState(false);
  const [myRole, setMyRole] = useState(null);

  const emojis = ['🙏', '🔥', '😮', '🕊️', '💪', '⭐'];

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const role = urlParams.get('role') || 'player1';
    const userId = urlParams.get('userId') || 'user_temp';
    
    setMyRole(role);

    socketRef.current = io(BACKEND_URL, {
      transports: ['websocket', 'polling'],
      reconnection: true
    });

    socketRef.current.on('connect', () => {
      console.log('✓ Connected to server');
      socketRef.current.emit('join_duo_room', {
        match_id: matchId,
        user_id: userId,
        role: role
      });
    });

    socketRef.current.on('joined_room', (data) => {
      console.log('✓ Joined room', data);
      setGameState('waiting');
    });

    socketRef.current.on('both_players_ready', () => {
      setGameState('both_ready');
      socketRef.current.emit('player_ready', { match_id: matchId, role: role });
    });

    socketRef.current.on('player_ready_status', (data) => {
      console.log('Player ready:', data);
    });

    socketRef.current.on('new_question', (data) => {
      console.log('New question:', data);
      setCurrentQuestion(data);
      setGameState('playing');
      setTimeLeft(data.timer);
      setSelectedAnswer(null);
      setShowResults(false);
      setRoundResult(null);
      setOpponentAnswered(false);
    });

    socketRef.current.on('opponent_answered', () => {
      setOpponentAnswered(true);
    });

    socketRef.current.on('round_results', (data) => {
      console.log('Round results:', data);
      setRoundResult(data);
      setShowResults(true);
      
      if (data[role]) {
        setMyScore(data[role].total_score);
      }
      
      const opponentRole = role === 'player1' ? 'player2' : 'player1';
      if (data[opponentRole]) {
        setOpponentScore(data[opponentRole].total_score);
      }
    });

    socketRef.current.on('game_end', (data) => {
      console.log('Game end:', data);
      setFinalResult(data);
      setGameState('finished');
      
      if (data.winner === role || (data.winner === 'draw' && data[`${role}_score`] > 1000)) {
        setShowConfetti(true);
        setTimeout(() => setShowConfetti(false), 5000);
      }
    });

    socketRef.current.on('emoji_received', (data) => {
      console.log('Emoji received:', data);
    });

    socketRef.current.on('opponent_disconnected', () => {
      alert('Adversaire déconnecté');
      navigate('/duo');
    });

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, [matchId, navigate]);

  useEffect(() => {
    if (gameState === 'playing' && timeLeft > 0 && !showResults) {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
      return () => clearTimeout(timer);
    } else if (timeLeft === 0 && !showResults && !selectedAnswer) {
      handleAnswer(-1);
    }
  }, [timeLeft, gameState, showResults, selectedAnswer]);

  const handleAnswer = (answerIndex) => {
    if (selectedAnswer !== null || showResults) return;
    
    setSelectedAnswer(answerIndex);
    socketRef.current.emit('submit_answer', {
      match_id: matchId,
      role: myRole,
      answer: answerIndex
    });
  };

  const sendEmoji = (emoji) => {
    socketRef.current.emit('send_emoji', {
      match_id: matchId,
      emoji: emoji,
      role: myRole
    });
  };

  const requestRematch = () => {
    socketRef.current.emit('request_rematch', {
      match_id: matchId,
      role: myRole
    });
    navigate('/duo');
  };

  const myScoreProgress = (myScore / 2000) * 100;
  const opponentScoreProgress = (opponentScore / 2000) * 100;

  if (gameState === 'connecting') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-900 to-purple-900">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-yellow-400 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-white text-lg">Connexion au match...</p>
        </div>
      </div>
    );
  }

  if (gameState === 'waiting' || gameState === 'both_ready') {
    return (
      <div className="min-h-screen relative overflow-hidden flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #1E3A8A 0%, #312E81 50%, #1E3A8A 100%)' }}>
        <motion.div
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="text-center"
        >
          <motion.div
            animate={{ rotate: [0, 10, -10, 0] }}
            transition={{ duration: 0.5, repeat: Infinity }}
            className="text-9xl mb-8"
          >
            ⚔️
          </motion.div>
          <h2 className="text-4xl font-bold text-white mb-4">
            {gameState === 'waiting' ? 'En attente du second joueur...' : 'Les deux joueurs sont prêts !'}
          </h2>
          {gameState === 'both_ready' && (
            <motion.p
              initial={{ scale: 0 }}
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 0.6, repeat: Infinity }}
              className="text-yellow-400 text-2xl font-bold"
            >
              Le duel commence dans 3...
            </motion.p>
          )}
        </motion.div>
      </div>
    );
  }

  if (gameState === 'finished' && finalResult) {
    const myFinalScore = finalResult[`${myRole}_score`];
    const opponentRole = myRole === 'player1' ? 'player2' : 'player1';
    const opponentFinalScore = finalResult[`${opponentRole}_score`];
    const iWon = finalResult.winner === myRole;
    const isDraw = finalResult.winner === 'draw';

    return (
      <div className="min-h-screen relative overflow-hidden flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #1E3A8A 0%, #312E81 50%, #1E3A8A 100%)' }}>
        {showConfetti && <Confetti recycle={false} numberOfPieces={500} />}
        
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-2xl w-full mx-4"
        >
          <Card className="p-8 bg-white/10 backdrop-blur-md border-white/20">
            <div className="text-center mb-8">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: [0, 1.2, 1] }}
                className="text-8xl mb-4"
              >
                {iWon ? '🏆' : isDraw ? '🤝' : '😅'}
              </motion.div>
              <h2 className="text-4xl font-bold text-white mb-2" style={{ fontFamily: 'Fraunces, serif' }}>
                {iWon ? 'Victoire !' : isDraw ? 'Match Nul !' : 'Défaite'}
              </h2>
              <p className="text-blue-200">
                {iWon ? 'Félicitations champion !' : isDraw ? 'Vous êtes à égalité !' : 'Réessayez pour la victoire !'}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-6 mb-8">
              <div className="text-center p-4 rounded-lg bg-blue-500/20">
                <p className="text-blue-200 text-sm mb-1">Votre Score</p>
                <p className="text-4xl font-bold text-white">{myFinalScore}</p>
              </div>
              <div className="text-center p-4 rounded-lg bg-purple-500/20">
                <p className="text-blue-200 text-sm mb-1">Adversaire</p>
                <p className="text-4xl font-bold text-white">{opponentFinalScore}</p>
              </div>
            </div>

            <div className="space-y-3">
              <Button
                onClick={requestRematch}
                className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white text-lg"
              >
                ⚔️ Revanche !
              </Button>
              <Button
                onClick={() => navigate('/duo')}
                variant="outline"
                className="w-full bg-white/10 border-white/20 text-white hover:bg-white/20"
              >
                Retour au menu
              </Button>
            </div>
          </Card>
        </motion.div>
      </div>
    );
  }

  if (!currentQuestion) return null;

  return (
    <div className="min-h-screen relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #1E3A8A 0%, #312E81 50%, #1E3A8A 100%)' }}>
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-20 left-10 w-72 h-72 bg-yellow-400 rounded-full blur-3xl"></div>
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-purple-400 rounded-full blur-3xl"></div>
      </div>

      <div className="relative z-10 container mx-auto px-4 py-6">
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-blue-400" />
              <span className="text-white font-semibold">Vous</span>
            </div>
            <span className="text-yellow-400 font-bold text-lg">{myScore}</span>
          </div>
          <Progress value={myScoreProgress} className="h-3 bg-blue-950 mb-1" />
          
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Trophy className="w-5 h-5 text-purple-400" />
              <span className="text-white font-semibold">Adversaire</span>
            </div>
            <span className="text-purple-300 font-bold text-lg">{opponentScore}</span>
          </div>
          <Progress value={opponentScoreProgress} className="h-3 bg-purple-950" />
        </div>

        <div className="flex items-center justify-between mb-6">
          <span className="text-white font-semibold">
            Question {currentQuestion.question_index + 1}/{currentQuestion.total_questions}
          </span>
          <div className={`flex items-center gap-2 text-2xl font-bold ${timeLeft <= 5 ? 'text-red-400 animate-pulse' : 'text-white'}`}>
            <Clock className="w-6 h-6" />
            {timeLeft}s
          </div>
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={currentQuestion.question_index}
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
          >
            <Card className="p-6 bg-white/10 backdrop-blur-md border-white/20 mb-6">
              <p className="text-sm text-blue-200 mb-2">{currentQuestion.book}</p>
              <h2 className="text-2xl font-bold text-white mb-1">
                {currentQuestion.text}
              </h2>
              {opponentAnswered && !showResults && (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-purple-300 text-sm mt-2"
                >
                  ⚡ L'adversaire a déjà répondu !
                </motion.p>
              )}
            </Card>

            <div className="grid grid-cols-2 gap-4 mb-6">
              {currentQuestion.options.map((option, index) => (
                <motion.button
                  key={index}
                  whileHover={{ scale: showResults ? 1 : 1.02 }}
                  whileTap={{ scale: showResults ? 1 : 0.98 }}
                  onClick={() => handleAnswer(index)}
                  disabled={selectedAnswer !== null || showResults}
                  className={`p-4 rounded-xl text-left font-medium transition-all ${
                    showResults && roundResult
                      ? index === roundResult.correct_answer
                        ? 'bg-emerald-500/50 border-2 border-emerald-400 text-white'
                        : index === selectedAnswer
                        ? 'bg-red-500/50 border-2 border-red-400 text-white'
                        : 'bg-white/5 border border-white/10 text-white/50'
                      : selectedAnswer === index
                      ? 'bg-blue-500/50 border-2 border-blue-400 text-white'
                      : 'bg-white/10 border border-white/20 text-white hover:bg-white/20'
                  }`}
                >
                  {option}
                </motion.button>
              ))}
            </div>

            {showResults && roundResult && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <Card className="p-6 bg-white/10 backdrop-blur-md border-white/20">
                  <div className="grid grid-cols-2 gap-4">
                    <div className={`p-4 rounded-lg ${roundResult[myRole]?.correct ? 'bg-emerald-500/20' : 'bg-red-500/20'}`}>
                      <p className="text-sm text-blue-200 mb-1">Votre réponse</p>
                      <p className="text-2xl font-bold text-white">
                        {roundResult[myRole]?.correct ? '✓' : '✗'} +{roundResult[myRole]?.points || 0}
                      </p>
                      <p className="text-xs text-blue-200">Temps: {roundResult[myRole]?.time}s</p>
                    </div>
                    <div className={`p-4 rounded-lg ${roundResult[myRole === 'player1' ? 'player2' : 'player1']?.correct ? 'bg-emerald-500/20' : 'bg-red-500/20'}`}>
                      <p className="text-sm text-blue-200 mb-1">Adversaire</p>
                      <p className="text-2xl font-bold text-white">
                        {roundResult[myRole === 'player1' ? 'player2' : 'player1']?.correct ? '✓' : '✗'} +{roundResult[myRole === 'player1' ? 'player2' : 'player1']?.points || 0}
                      </p>
                      <p className="text-xs text-blue-200">Temps: {roundResult[myRole === 'player1' ? 'player2' : 'player1']?.time}s</p>
                    </div>
                  </div>
                </Card>
              </motion.div>
            )}

            <div className="flex gap-2 justify-center mt-6">
              {emojis.map((emoji, idx) => (
                <motion.button
                  key={idx}
                  whileHover={{ scale: 1.2 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => sendEmoji(emoji)}
                  className="text-3xl p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-all"
                >
                  {emoji}
                </motion.button>
              ))}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
};

export default DuoPlay;
