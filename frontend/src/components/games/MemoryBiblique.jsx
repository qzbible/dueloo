import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

const MemoryBiblique = ({ onSubmit, duelMode, opponentMove, onMove, bothReady }) => {
  const [gameData, setGameData] = useState(null);
  const [flippedCards, setFlippedCards] = useState([]);
  const [matchedCards, setMatchedCards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [moves, setMoves] = useState(0);
  const [opponentMatchedCount, setOpponentMatchedCount] = useState(0);

  useEffect(() => {
    if (duelMode) {
      if (bothReady && duelMode.role === 'player1') {
        fetchGameData();
      }
    } else {
      fetchGameData();
    }
  }, [bothReady]);

  useEffect(() => {
    if (duelMode && opponentMove) {
      if (opponentMove.type === 'init' && duelMode.role === 'player2') {
        setGameData(opponentMove.gameData);
        setLoading(false);
      } else if (opponentMove.type === 'match') {
        setOpponentMatchedCount(opponentMove.count);
      }
    }
  }, [opponentMove]);

  useEffect(() => {
    if (flippedCards.length === 2) {
      checkMatch();
    }
  }, [flippedCards]);

  useEffect(() => {
    if (matchedCards.length === gameData?.cards.length) {
      setTimeout(() => {
        onSubmit({ matches: matchedCards.length / 2 });
      }, 1000);
    }
  }, [matchedCards]);

  const fetchGameData = async () => {
    try {
      const response = await axios.post(
        `${BACKEND_URL}/api/games/start`,
        { mode_id: 'memory_biblique' },
        { withCredentials: true }
      );
      setGameData(response.data.game_data);
      if (duelMode && duelMode.role === 'player1') {
        onMove({ type: 'init', gameData: response.data.game_data });
      }
    } catch (error) {
      console.error('Erreur:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCardClick = (index) => {
    if (flippedCards.length === 2 || flippedCards.includes(index) || matchedCards.includes(index)) {
      return;
    }
    setFlippedCards([...flippedCards, index]);
    setMoves(moves + 1);
  };

  const checkMatch = () => {
    const [first, second] = flippedCards;
    const card1 = gameData.cards[first];
    const card2 = gameData.cards[second];

    if (card1.symbol === card2.symbol) {
      const newMatched = [...matchedCards, first, second];
      setMatchedCards(newMatched);
      if (duelMode) onMove({ type: 'match', count: newMatched.length / 2 });
      setFlippedCards([]);
    } else {
      setTimeout(() => {
        setFlippedCards([]);
      }, 1000);
    }
  };

  if (loading || !gameData) {
    return <div className="text-center text-white">Chargement...</div>;
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6 text-center">
        <span className="text-yellow-400 font-semibold text-lg">
          Coups : {moves} | Paires trouvées : {matchedCards.length / 2}/8
          {duelMode && <span className="ml-8 text-emerald-400">Adversaire : {opponentMatchedCount}/8</span>}
        </span>
      </div>

      <div className="grid grid-cols-4 gap-4">
        {gameData.cards.map((card, index) => {
          const isFlipped = flippedCards.includes(index) || matchedCards.includes(index);
          
          return (
            <Card
              key={index}
              data-testid={`card-${index}`}
              onClick={() => handleCardClick(index)}
              className={`aspect-square flex items-center justify-center text-5xl cursor-pointer transition-all ${
                isFlipped
                  ? 'bg-white/20 backdrop-blur-md border-white/40'
                  : 'bg-gradient-to-br from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700'
              }`}
            >
              {isFlipped ? card.symbol : '?'}
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default MemoryBiblique;
