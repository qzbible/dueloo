import React, { useState, useEffect, useRef } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

const Skribbl = ({ onSubmit }) => {
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [word, setWord] = useState('');
  const [timer, setTimer] = useState(60);
  const [guesses, setGuesses] = useState([]);
  const [completed, setCompleted] = useState(false);
  
  const words = ["Arche de Noé", "Moïse", "Jésus", "Croix", "David et Goliath", "Samson", "Adam et Ève", "La Cène", "Temple de Salomon", "Buisson Ardent"];

  useEffect(() => {
    setWord(words[Math.floor(Math.random() * words.length)]);
    const t = setInterval(() => setTimer(s => {
        if (s <= 1) { clearInterval(t); return 0; }
        return s - 1;
    }), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
      // Simulate fake guesses from "other players"
      const names = ["Gabriel", "Sarah", "Isaac", "Jean", "Marie"];
      if (timer % 5 === 0 && timer > 0 && !completed) {
          const name = names[Math.floor(Math.random() * names.length)];
          setGuesses(prev => [{ name, msg: "Est-ce un bateau ?", id: Date.now() }, ...prev.slice(0, 10)]);
      }
  }, [timer, completed]);

  const startDrawing = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const ctx = canvasRef.current.getContext('2d');
    ctx.beginPath();
    ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
    setIsDrawing(true);
  };

  const draw = (e) => {
    if (!isDrawing) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const ctx = canvasRef.current.getContext('2d');
    ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top);
    ctx.strokeStyle = 'white';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.stroke();
  };

  const stopDrawing = () => setIsDrawing(false);

  const handleSubmit = () => {
    setCompleted(true);
    setGuesses(prev => [{ name: "Système", msg: "Bravo ! Tout le monde a trouvé !", id: 'win' }, ...prev]);
    setTimeout(() => onSubmit({ words_guessed: 5 }), 2000);
  };

  return (
    <div className="max-w-5xl mx-auto grid grid-cols-4 gap-6">
      <div className="col-span-1 space-y-4">
        <Card className="p-4 bg-white/10 border-white/20 text-white">
          <h3 className="font-bold border-b border-white/10 pb-2 mb-2">Joueurs</h3>
          <ul className="space-y-2">
            <li className="flex justify-between items-center text-yellow-400"><span>Vous ✏️</span> <span>120</span></li>
            <li className="flex justify-between items-center"><span>Gabriel</span> <span>80</span></li>
            <li className="flex justify-between items-center"><span>Sarah</span> <span>45</span></li>
          </ul>
        </Card>
      </div>

      <div className="col-span-2 space-y-4">
        <div className="flex justify-between items-center text-white p-2">
            <div className="bg-yellow-500/20 px-4 py-1 rounded-full font-bold">Temps: {timer}s</div>
            <div className="text-2xl font-black tracking-widest">{word.toUpperCase()}</div>
            <Button variant="outline" size="sm" onClick={() => canvasRef.current.getContext('2d').clearRect(0,0,800,800)}>Effacer</Button>
        </div>
        <Card className="bg-white p-0 relative aspect-video overflow-hidden shadow-2xl cursor-crosshair">
          <canvas 
            ref={canvasRef} 
            width={800} height={450} 
            className="w-full h-full bg-zinc-900"
            onMouseDown={startDrawing}
            onMouseMove={draw}
            onMouseUp={stopDrawing}
            onMouseLeave={stopDrawing}
          />
        </Card>
        <div className="flex justify-end">
            <Button onClick={handleSubmit} className="bg-emerald-600 hover:bg-emerald-700 font-bold px-12 h-14 rounded-2xl">J'ai fini !</Button>
        </div>
      </div>

      <div className="col-span-1 border-l border-white/10 pl-6 flex flex-col h-[500px]">
        <h3 className="text-white font-bold mb-4">Chat / Réponses</h3>
        <div className="flex-grow overflow-y-auto space-y-2 pr-2 custom-scrollbar">
            {guesses.map(g => (
                <div key={g.id} className={`p-2 rounded-lg text-sm ${g.id === 'win' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-white/5 text-zinc-300'}`}>
                    <span className="font-bold mr-2">{g.name}:</span> {g.msg}
                </div>
            ))}
        </div>
      </div>
    </div>
  );
};

export default Skribbl;
