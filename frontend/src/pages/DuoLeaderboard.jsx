import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ArrowLeft, Trophy, Medal, TrendingUp } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

const DuoLeaderboard = () => {
  const navigate = useNavigate();
  const [leaderboard, setLeaderboard] = useState([]);
  const [myStats, setMyStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [leaderboardRes, statsRes] = await Promise.all([
        axios.get(`${BACKEND_URL}/api/duo/leaderboard?limit=100`),
        axios.get(`${BACKEND_URL}/api/duo/stats`, { withCredentials: true })
      ]);

      setLeaderboard(leaderboardRes.data);
      setMyStats(statsRes.data);
    } catch (error) {
      console.error('Erreur:', error);
    } finally {
      setLoading(false);
    }
  };

  const getRankIcon = (rank) => {
    if (rank === 1) return <Trophy className="w-6 h-6 text-yellow-400" />;
    if (rank === 2) return <Medal className="w-6 h-6 text-gray-300" />;
    if (rank === 3) return <Medal className="w-6 h-6 text-orange-400" />;
    return <span className="text-blue-200 font-bold">#{rank}</span>;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-900 to-purple-900">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-yellow-400 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-white text-lg">Chargement...</p>
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
        <Button
          onClick={() => navigate('/duo')}
          variant="outline"
          className="bg-white/10 backdrop-blur-md border-white/20 text-white hover:bg-white/20 mb-6"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Retour
        </Button>

        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <Trophy className="w-16 h-16 text-yellow-400 mx-auto mb-4" />
          <h1 className="text-4xl sm:text-5xl font-bold text-white mb-3" style={{ fontFamily: 'Fraunces, serif' }}>
            Classement Duo
          </h1>
          <p className="text-lg text-blue-200">Top 100 joueurs PvP</p>
        </motion.div>

        {myStats && (
          <Card className="max-w-3xl mx-auto p-6 bg-gradient-to-r from-blue-500/20 to-purple-500/20 backdrop-blur-md border-2 border-yellow-400/50 mb-8">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold text-white mb-2">Votre Classement</h3>
                <div className="flex items-center gap-4">
                  <div>
                    <span className="text-3xl font-bold text-yellow-400">#{myStats.rank}</span>
                  </div>
                  <div className="text-left">
                    <div className="text-2xl font-bold text-white">{myStats.mmr} MMR</div>
                    <div className="text-sm text-blue-200">{myStats.wins}V {myStats.losses}D {myStats.draws}N</div>
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-4xl font-bold text-emerald-400">{myStats.winrate}%</div>
                <div className="text-sm text-blue-200">Winrate</div>
              </div>
            </div>
          </Card>
        )}

        <div className="max-w-4xl mx-auto space-y-3">
          {leaderboard.map((player, index) => (
            <motion.div
              key={player.user_id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.02 }}
            >
              <Card className={`p-4 bg-white/10 backdrop-blur-md border-white/20 hover:bg-white/15 transition-all ${
                index < 3 ? 'ring-2 ring-yellow-400/50' : ''
              }`}>
                <div className="flex items-center gap-4">
                  <div className="w-12 text-center">
                    {getRankIcon(player.rank)}
                  </div>
                  
                  <img
                    src={player.picture || 'https://via.placeholder.com/50'}
                    alt={player.name}
                    className="w-12 h-12 rounded-full border-2 border-white/20"
                  />
                  
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-white">{player.name}</h3>
                    <div className="flex items-center gap-3 text-sm text-blue-200">
                      <span>Niveau {player.level}</span>
                      <span>•</span>
                      <span>{player.wins}V {player.losses}D {player.draws}N</span>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <div className="flex items-center gap-2 mb-1">
                      <TrendingUp className="w-4 h-4 text-yellow-400" />
                      <span className="text-2xl font-bold text-yellow-400">{player.mmr}</span>
                    </div>
                    <div className="text-sm text-emerald-400 font-semibold">{player.winrate}% WR</div>
                  </div>
                </div>
              </Card>
            </motion.div>
          ))}

          {leaderboard.length === 0 && (
            <div className="text-center py-12">
              <Trophy className="w-16 h-16 text-blue-400 mx-auto mb-4 opacity-50" />
              <p className="text-blue-200 text-lg">Aucun classement pour le moment</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DuoLeaderboard;
