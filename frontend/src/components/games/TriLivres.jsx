import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

const TriLivres = ({ onSubmit }) => {
  const [books] = useState([
    { name: 'Genèse', testament: 'Ancien' },
    { name: 'Exode', testament: 'Ancien' },
    { name: 'Matthieu', testament: 'Nouveau' },
    { name: 'Jean', testament: 'Nouveau' },
    { name: 'Romains', testament: 'Nouveau' },
    { name: 'Psaumes', testament: 'Ancien' },
    { name: 'Apocalypse', testament: 'Nouveau' },
    { name: 'Lévitique', testament: 'Ancien' }
  ]);
  
  const [shuffledBooks, setShuffledBooks] = useState(() => 
    [...books].sort(() => Math.random() - 0.5)
  );
  
  const [ancien, setAncien] = useState([]);
  const [nouveau, setNouveau] = useState([]);
  const [draggedBook, setDraggedBook] = useState(null);

  const handleDragStart = (book) => {
    setDraggedBook(book);
  };

  const handleDrop = (testament) => {
    if (!draggedBook) return;

    if (testament === 'Ancien') {
      setAncien([...ancien, draggedBook]);
    } else {
      setNouveau([...nouveau, draggedBook]);
    }

    setShuffledBooks(shuffledBooks.filter(b => b !== draggedBook));
    setDraggedBook(null);

    if (shuffledBooks.length === 1) {
      setTimeout(() => {
        const finalAncien = testament === 'Ancien' ? [...ancien, draggedBook] : ancien;
        const finalNouveau = testament === 'Nouveau' ? [...nouveau, draggedBook] : nouveau;
        
        const correctAncien = finalAncien.filter(b => b.testament === 'Ancien').length;
        const correctNouveau = finalNouveau.filter(b => b.testament === 'Nouveau').length;
        
        onSubmit({ matches: correctAncien + correctNouveau });
      }, 500);
    }
  };

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-6">
        <p className="text-center text-white text-lg mb-4">
          Glissez chaque livre dans le bon testament
        </p>
        <div className="flex flex-wrap gap-3 justify-center min-h-24 p-4 rounded-lg bg-white/5">
          {shuffledBooks.map((book, idx) => (
            <div
              key={idx}
              draggable
              onDragStart={() => handleDragStart(book)}
              className="px-4 py-2 bg-gradient-to-r from-purple-400 to-purple-600 text-white rounded-lg cursor-move hover:scale-105 transition-transform"
            >
              {book.name}
            </div>
          ))}
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <Card
          onDragOver={(e) => e.preventDefault()}
          onDrop={() => handleDrop('Ancien')}
          className="p-6 bg-white/10 backdrop-blur-md border-white/20 min-h-48"
        >
          <h3 className="text-2xl font-bold text-yellow-400 mb-4 text-center">
            Ancien Testament
          </h3>
          <div className="flex flex-wrap gap-2">
            {ancien.map((book, idx) => (
              <div
                key={idx}
                className={`px-3 py-1 rounded ${
                  book.testament === 'Ancien'
                    ? 'bg-emerald-500 text-white'
                    : 'bg-red-500 text-white'
                }`}
              >
                {book.name}
              </div>
            ))}
          </div>
        </Card>

        <Card
          onDragOver={(e) => e.preventDefault()}
          onDrop={() => handleDrop('Nouveau')}
          className="p-6 bg-white/10 backdrop-blur-md border-white/20 min-h-48"
        >
          <h3 className="text-2xl font-bold text-yellow-400 mb-4 text-center">
            Nouveau Testament
          </h3>
          <div className="flex flex-wrap gap-2">
            {nouveau.map((book, idx) => (
              <div
                key={idx}
                className={`px-3 py-1 rounded ${
                  book.testament === 'Nouveau'
                    ? 'bg-emerald-500 text-white'
                    : 'bg-red-500 text-white'
                }`}
              >
                {book.name}
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
};

export default TriLivres;
