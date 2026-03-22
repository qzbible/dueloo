import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ArrowLeft, Lock, CheckCircle, Book } from 'lucide-react';

const BIBLE_BOOKS = [
  { id: 'genese', name: 'Genèse', testament: 'Ancien', color: 'from-emerald-400 to-emerald-600', locked: false },
  { id: 'exode', name: 'Exode', testament: 'Ancien', color: 'from-blue-400 to-blue-600', locked: false },
  { id: 'matthieu', name: 'Matthieu', testament: 'Nouveau', color: 'from-purple-400 to-purple-600', locked: false },
  { id: 'jean', name: 'Jean', testament: 'Nouveau', color: 'from-pink-400 to-pink-600', locked: false },
  { id: 'romains', name: 'Romains', testament: 'Nouveau', color: 'from-orange-400 to-orange-600', locked: true },
  { id: 'apocalypse', name: 'Apocalypse', testament: 'Nouveau', color: 'from-red-400 to-red-600', locked: true }
];

const Campaign = () => {
  const navigate = useNavigate();
  const [selectedBook, setSelectedBook] = useState(null);

  const startQuiz = (book) => {
    if (book.locked) return;
    navigate(`/quiz?book=${book.name}`);
  };

  return (
    <div className="min-h-screen relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #1E3A8A 0%, #312E81 50%, #1E3A8A 100%)' }}>
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-20 left-10 w-72 h-72 bg-yellow-400 rounded-full blur-3xl"></div>
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-purple-400 rounded-full blur-3xl"></div>
      </div>

      <div className="relative z-10 container mx-auto px-4 py-8">
        <div className="mb-8">
          <Button 
            data-testid="back-to-dashboard-button"
            onClick={() => navigate('/dashboard')}
            variant="outline"
            className="bg-white/10 backdrop-blur-md border-white/20 text-white hover:bg-white/20 mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Retour
          </Button>
          
          <motion.h1 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-4xl sm:text-5xl font-bold text-white mb-3"
            style={{ fontFamily: 'Fraunces, serif' }}
          >
            Campagne Biblique
          </motion.h1>
          <p className="text-lg text-blue-200" style={{ fontFamily: 'Manrope, sans-serif' }}>
            Traversez la Bible de la Genèse à l'Apocalypse
          </p>
        </div>

        <div className="max-w-2xl mx-auto">
          <div className="relative">
            <div className="absolute left-1/2 transform -translate-x-1/2 h-full w-1 bg-gradient-to-b from-yellow-400 via-blue-500 to-purple-600 opacity-30"></div>
            
            <div className="space-y-8">
              {BIBLE_BOOKS.map((book, index) => (
                <motion.div
                  key={book.id}
                  initial={{ opacity: 0, x: index % 2 === 0 ? -50 : 50 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  className={`relative ${index % 2 === 0 ? 'mr-auto' : 'ml-auto'} w-[calc(50%-2rem)]`}
                >
                  <Card 
                    className={`p-6 bg-white/10 backdrop-blur-md border-white/20 hover:bg-white/15 transition-all cursor-pointer ${
                      book.locked ? 'opacity-60' : ''
                    }`}
                    onClick={() => !book.locked && startQuiz(book)}
                    data-testid={`book-${book.id}`}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className={`w-12 h-12 rounded-full bg-gradient-to-br ${book.color} flex items-center justify-center`}>
                          {book.locked ? (
                            <Lock className="w-6 h-6 text-white" />
                          ) : (
                            <Book className="w-6 h-6 text-white" />
                          )}
                        </div>
                        <div>
                          <h3 className="text-xl font-bold text-white" style={{ fontFamily: 'Manrope, sans-serif' }}>
                            {book.name}
                          </h3>
                          <p className="text-sm text-blue-200">{book.testament} Testament</p>
                        </div>
                      </div>
                      
                      {!book.locked && (
                        <CheckCircle className="w-6 h-6 text-emerald-400" />
                      )}
                    </div>
                    
                    {!book.locked && (
                      <Button 
                        className={`w-full mt-2 bg-gradient-to-r ${book.color} text-white hover:opacity-90`}
                        size="sm"
                      >
                        Commencer
                      </Button>
                    )}
                  </Card>
                  
                  <div className={`absolute top-1/2 transform -translate-y-1/2 ${
                    index % 2 === 0 ? 'right-[-2rem]' : 'left-[-2rem]'
                  } w-8 h-8 rounded-full bg-gradient-to-br ${book.color} border-4 border-blue-900 z-10`}></div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Campaign;
