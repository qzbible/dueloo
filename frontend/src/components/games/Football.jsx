import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';

const Football = ({ onSubmit }) => {
  const [score, setScore] = useState(0);
  const [attempts, setAttempts] = useState(0);
  const [ballPos, setBallPos] = useState({ x: 0, y: 0 });
  const [gkPos, setGkPos] = useState(0);
  const [isShooting, setIsShooting] = useState(false);
  const [result, setResult] = useState(null);

  const shoot = (targetX) => {
    if (isShooting || attempts >= 5) return;
    setIsShooting(true);
    setBallPos({ x: targetX, y: -250 });
    
    // AI Goal Keeper
    const randomGk = (Math.random() - 0.5) * 200;
    setGkPos(randomGk);

    setTimeout(() => {
        const isGoal = Math.abs(targetX - randomGk) > 50;
        if (isGoal) {
            setScore(s => s + 1);
            setResult('GOAL !');
        } else {
            setResult('ARRÊTÉ !');
        }
        setAttempts(a => a + 1);

        setTimeout(() => {
            setBallPos({ x: 0, y: 0 });
            setIsShooting(false);
            setResult(null);
            if (attempts + 1 >= 5) {
                onSubmit({ score: (score + (isGoal ? 1 : 0)) * 2 });
            }
        }, 1000);
    }, 1000);
  };

  return (
    <div className="max-w-4xl mx-auto text-center">
      <div className="mb-8">
        <h2 className="text-4xl font-black text-white mb-2">Tir au but</h2>
        <div className="flex gap-8 justify-center text-xl font-bold bg-white/5 p-4 rounded-2xl border border-white/10">
            <span className="text-yellow-400">Buts: {score}</span>
            <span className="text-blue-300">Tirs: {attempts}/5</span>
        </div>
      </div>

      <div className="relative h-[400px] w-full bg-emerald-600 rounded-t-[5rem] overflow-hidden border-b-8 border-white/30 p-12">
        {/* Goal */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-48 border-x-8 border-t-8 border-white bg-white/10 flex items-center justify-center">
            {/* Goal Keeper */}
            <motion.div
                animate={{ x: gkPos }}
                className="w-16 h-28 bg-red-500 rounded-lg flex flex-col items-center p-2 shadow-2xl"
            >
                <div className="w-8 h-8 rounded-full bg-orange-200 mb-2" />
                <div className="w-full h-full bg-red-400 rounded" />
            </motion.div>
        </div>

        {/* Ball */}
        <motion.div
            animate={{ x: ballPos.x, y: ballPos.y, rotate: isShooting ? 720 : 0 }}
            transition={{ duration: 0.5 }}
            className="absolute bottom-10 left-1/2 -translate-x-1/2 w-12 h-12 bg-white rounded-full border-4 border-zinc-800 shadow-xl flex items-center justify-center font-black"
        >
            ⚽
        </motion.div>

        <AnimatePresence>
            {result && (
                <motion.div initial={{ scale: 0 }} animate={{ scale: 1.5 }} exit={{ opacity: 0 }} className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <span className={`text-6xl font-black italic drop-shadow-2xl ${result === 'GOAL !' ? 'text-yellow-400' : 'text-red-500'}`}>
                        {result}
                    </span>
                </motion.div>
            )}
        </AnimatePresence>
      </div>

      <div className="mt-8 grid grid-cols-3 gap-6 max-w-lg mx-auto">
        <Button onClick={() => shoot(-120)} disabled={isShooting || attempts >= 5} className="h-20 bg-emerald-700 hover:bg-emerald-800 rounded-2xl font-black text-xl">Gauche</Button>
        <Button onClick={() => shoot(0)} disabled={isShooting || attempts >= 5} className="h-20 bg-emerald-700 hover:bg-emerald-800 rounded-2xl font-black text-xl">Centre</Button>
        <Button onClick={() => shoot(120)} disabled={isShooting || attempts >= 5} className="h-20 bg-emerald-700 hover:bg-emerald-800 rounded-2xl font-black text-xl">Droite</Button>
      </div>
    </div>
  );
};

export default Football;
