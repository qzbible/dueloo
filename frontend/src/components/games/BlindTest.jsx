import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';

const BlindTest = ({ onSubmit, duelMode, opponentMove, onMove, bothReady }) => {
  const [currentSong, setCurrentSong] = useState(null);
  const [options, setOptions] = useState([]);
  const [score, setScore] = useState(0);
  const [round, setRound] = useState(0);
  const [result, setResult] = useState(null);
  const [opponentScore, setOpponentScore] = useState(0);

  const songs = [
    { title: "Grâce Infinie", artist: "Traditionnel", hint: "Chant sur le salut gratuit" },
    { title: "Plus près de toi mon Dieu", artist: "Traditionnel", hint: "Chant du Titanic" },
    { title: "Grand Dieu nous te bénissons", artist: "Traditionnel", hint: "Hymne à la majesté" },
    { title: "Quel ami fidèle et tendre", artist: "Traditionnel", hint: "Jésus est cet ami" },
  ];

  const startRound = (remoteData = null) => {
    let song, opts;
    if (remoteData) {
        song = remoteData.song;
        opts = remoteData.options;
    } else {
        song = songs[Math.floor(Math.random() * songs.length)];
        opts = [song.title];
        while (opts.length < 4) {
            const r = songs[Math.floor(Math.random()*songs.length)].title;
            if (!opts.includes(r)) opts.push(r);
        }
        opts = opts.sort(() => Math.random() - 0.5);
    }

    if (duelMode && duelMode.role === 'player1' && !remoteData) {
        onMove({ type: 'round', song, options: opts });
    }

    setCurrentSong(song);
    setOptions(opts);
    setResult(null);
  };

  useEffect(() => {
    if (duelMode) {
        if (bothReady && duelMode.role === 'player1') startRound();
    } else {
        startRound();
    }
  }, [bothReady]);

  useEffect(() => {
    if (duelMode && opponentMove) {
      if (opponentMove.type === 'round' && duelMode.role === 'player2') {
        startRound(opponentMove);
      } else if (opponentMove.type === 'score') {
        setOpponentScore(opponentMove.score);
      }
    }
  }, [opponentMove]);

  const handleGuess = (guess) => {
    if (result) return;
    const correct = guess === currentSong.title;
    setResult(correct ? 'CORRECT !' : 'MAUVAIS...');
    const newScore = score + (correct ? 1 : 0);
    if (correct) setScore(newScore);
    if (duelMode) onMove({ type: 'score', score: newScore });
    
    setTimeout(() => {
        if (round + 1 >= 5) {
            onSubmit({ score: newScore * 2 });
        } else {
            setRound(r => r + 1);
            if (!duelMode || duelMode.role === 'player1') {
                startRound();
            }
        }
    }, 1500);
  };

  return (
    <div className="max-w-2xl mx-auto text-center">
      <div className="mb-12">
        <h2 className="text-4xl font-black text-white mb-2">Blind Test Biblique</h2>
        <div className="flex justify-center gap-8">
            <p className="text-blue-200">Score: {score}</p>
            {duelMode && <p className="text-emerald-400">Adversaire: {opponentScore}</p>}
        </div>
      </div>

      <Card className="p-12 bg-white/5 border-white/10 mb-8 backdrop-blur-md relative overflow-hidden">
        <div className="text-6xl mb-6 animate-bounce">📻</div>
        <div className="text-2xl font-bold text-white italic">
            "{currentSong?.hint}..."
        </div>
        
        <AnimatePresence>
            {result && (
                <motion.div initial={{ scale: 0 }} animate={{ scale: 1.2 }} className={`absolute inset-0 flex items-center justify-center bg-black/40 ${result === 'CORRECT !' ? 'text-emerald-400' : 'text-red-500'} text-4xl font-black`}>
                    {result}
                </motion.div>
            )}
        </AnimatePresence>
      </Card>

      <div className="grid grid-cols-2 gap-4">
        {options.map((opt, i) => (
            <Button key={i} onClick={() => handleGuess(opt)} className="h-16 text-lg font-bold bg-white/10 hover:bg-white/20 text-white rounded-2xl border border-white/20">
                {opt}
            </Button>
        ))}
      </div>
    </div>
  );
};

export default BlindTest;
