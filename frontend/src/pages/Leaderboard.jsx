import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, Trophy, Medal, Award } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

const Leaderboard = () => {
  const navigate = useNavigate();
  const [leaderboard, setLeaderboard] = useState([]);
  const [period, setPeriod] = useState('all_time');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLeaderboard();
  }, [period]);

  const fetchLeaderboard = async () => {
    try {
      const response = await axios.get(
        `${BACKEND_URL}/api/leaderboard?period=${period}&limit=50`
      );
      setLeaderboard(response.data);
    } catch (error) {
      console.error('Erreur:', error);
    } finally {
      setLoading(false);
    }
  };

  const getRankIcon = (rank) => {
    if (rank === 0) return <Trophy className="w-6 h-6 text-yellow-400" />;
    if (rank === 1) return <Medal className="w-6 h-6 text-gray-300" />;
    if (rank === 2) return <Medal className="w-6 h-6 text-orange-400" />;
    return <span className="text-blue-200 font-bold">#{rank + 1}</span>;
  };

  return (
    <div className="min-h-screen relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #1E3A8A 0%, #312E81 50%, #1E3A8A 100%)' }}>
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-20 left-10 w-72 h-72 bg-yellow-400 rounded-full blur-3xl"></div>
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-purple-400 rounded-full blur-3xl"></div>
      </div>

      <div className="relative z-10 container mx-auto px-4 py-8">
        <Button
          onClick={() => navigate('/dashboard')}
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
            Classement Global
          </h1>
          <p className="text-lg text-blue-200">Les meilleurs joueurs de Dueloo</p>
        </motion.div>

        <Tabs defaultValue="all_time" className="max-w-4xl mx-auto" onValueChange={setPeriod}>
          <TabsList className="bg-white/10 backdrop-blur-md border border-white/20 mb-8">
            <TabsTrigger value="all_time" className="data-[state=active]:bg-white/20">
              Tout temps
            </TabsTrigger>
            <TabsTrigger value="monthly" className="data-[state=active]:bg-white/20">
              Ce mois
            </TabsTrigger>
            <TabsTrigger value="weekly" className="data-[state=active]:bg-white/20">
              Cette semaine
            </TabsTrigger>
          </TabsList>

          <TabsContent value={period}>
            {loading ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 border-4 border-yellow-400 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-white">Chargement...</p>
              </div>
            ) : (
              <div className="space-y-3">
                {leaderboard.map((player, index) => (
                  <motion.div
                    key={player.user_id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.02 }}
                    data-testid={`leaderboard-rank-${index + 1}`}
                  >
                    <Card className={`p-4 bg-white/10 backdrop-blur-md border-white/20 hover:bg-white/15 transition-all ${
                      index < 3 ? 'ring-2 ring-yellow-400/50' : ''
                    }`}>
                      <div className="flex items-center gap-4">
                        <div className="w-12 text-center">
                          {getRankIcon(index)}
                        </div>
                        
                        <img
                          src={player.picture || 'https://via.placeholder.com/50'}
                          alt={player.name}
                          className="w-12 h-12 rounded-full border-2 border-white/20"
                        />
                        
                        <div className="flex-1">
                          <h3 className="text-lg font-bold text-white">{player.name}</h3>
                          <p className="text-sm text-blue-200">Niveau {player.level}</p>
                        </div>
                        
                        <div className="text-right">
                          <div className="text-2xl font-bold text-yellow-400">
                            {player.score}
                          </div>
                          <p className="text-xs text-blue-200">points</p>
                        </div>
                      </div>
                    </Card>
                  </motion.div>
                ))}

                {leaderboard.length === 0 && (
                  <div className="text-center py-12">
                    <Award className="w-16 h-16 text-blue-400 mx-auto mb-4 opacity-50" />
                    <p className="text-blue-200 text-lg">Aucun classement pour le moment</p>
                    <p className="text-blue-300 text-sm mt-2">Soyez le premier !</p>
                  </div>
                )}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Leaderboard;
