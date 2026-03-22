import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, Trophy, TrendingUp, Target, Crown } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

const DuoHistory = () => {
  const navigate = useNavigate();
  const [history, setHistory] = useState([]);
  const [stats, setStats] = useState(null);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, [filter]);

  const fetchData = async () => {
    try {
      const [historyRes, statsRes] = await Promise.all([
        axios.get(`${BACKEND_URL}/api/duo/history?filter=${filter}`, { withCredentials: true }),
        axios.get(`${BACKEND_URL}/api/duo/stats`, { withCredentials: true })
      ]);

      setHistory(historyRes.data);
      setStats(statsRes.data);
    } catch (error) {
      console.error('Erreur:', error);
      if (error.response?.status === 403) {
        alert('Fonctionnalité réservée Premium');
        navigate('/premium');
      }
    } finally {
      setLoading(false);
    }
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
          className="mb-8"
        >
          <h1 className="text-4xl sm:text-5xl font-bold text-white mb-3" style={{ fontFamily: 'Fraunces, serif' }}>
            Historique des Duels
          </h1>
          <p className="text-lg text-blue-200">Fonctionnalité Premium</p>
        </motion.div>

        {stats && (
          <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
            <Card className="p-4 bg-white/10 backdrop-blur-md border-white/20 text-center">
              <TrendingUp className="w-8 h-8 text-yellow-400 mx-auto mb-2" />
              <div className="text-3xl font-bold text-white">{stats.mmr}</div>
              <div className="text-sm text-blue-200">MMR</div>
              <div className="text-xs text-blue-300 mt-1">Rang #{stats.rank}</div>
            </Card>

            <Card className="p-4 bg-white/10 backdrop-blur-md border-white/20 text-center">
              <Trophy className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
              <div className="text-3xl font-bold text-white">{stats.wins}</div>
              <div className="text-sm text-blue-200">Victoires</div>
            </Card>

            <Card className="p-4 bg-white/10 backdrop-blur-md border-white/20 text-center">
              <Target className="w-8 h-8 text-red-400 mx-auto mb-2" />
              <div className="text-3xl font-bold text-white">{stats.losses}</div>
              <div className="text-sm text-blue-200">Défaites</div>
            </Card>

            <Card className="p-4 bg-white/10 backdrop-blur-md border-white/20 text-center">
              <Crown className="w-8 h-8 text-purple-400 mx-auto mb-2" />
              <div className="text-3xl font-bold text-white">{stats.draws}</div>
              <div className="text-sm text-blue-200">Nuls</div>
            </Card>

            <Card className="p-4 bg-white/10 backdrop-blur-md border-white/20 text-center">
              <div className="text-3xl font-bold text-white">{stats.winrate}%</div>
              <div className="text-sm text-blue-200">Winrate</div>
              <div className="text-xs text-blue-300 mt-1">{stats.total_matches} matchs</div>
            </Card>
          </div>
        )}

        <Tabs defaultValue="all" className="mb-8" onValueChange={setFilter}>
          <TabsList className="bg-white/10 backdrop-blur-md border border-white/20">
            <TabsTrigger value="all" className="data-[state=active]:bg-white/20">Tous</TabsTrigger>
            <TabsTrigger value="wins" className="data-[state=active]:bg-white/20">Victoires</TabsTrigger>
            <TabsTrigger value="losses" className="data-[state=active]:bg-white/20">Défaites</TabsTrigger>
            <TabsTrigger value="draws" className="data-[state=active]:bg-white/20">Nuls</TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="space-y-4">
          {history.map((match, index) => (
            <motion.div
              key={match.match_id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <Card className={`p-4 bg-white/10 backdrop-blur-md border-white/20 ${
                match.result === 'win' ? 'border-l-4 border-l-emerald-400' :
                match.result === 'loss' ? 'border-l-4 border-l-red-400' :
                'border-l-4 border-l-yellow-400'
              }`}>
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className={`text-2xl ${
                        match.result === 'win' ? 'text-emerald-400' :
                        match.result === 'loss' ? 'text-red-400' :
                        'text-yellow-400'
                      }`}>
                        {match.result === 'win' ? '🏆' : match.result === 'loss' ? '😅' : '🤝'}
                      </span>
                      <div>
                        <h3 className="text-lg font-bold text-white">vs {match.opponent}</h3>
                        <p className="text-sm text-blue-200">
                          {match.theme && `Thème: ${match.theme} • `}
                          {new Date(match.completed_at).toLocaleDateString('fr-FR', {
                            day: 'numeric',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-2xl font-bold text-white mb-1">
                      {match.my_score} - {match.opponent_score}
                    </div>
                    <span className={`text-sm font-semibold ${
                      match.result === 'win' ? 'text-emerald-400' :
                      match.result === 'loss' ? 'text-red-400' :
                      'text-yellow-400'
                    }`}>
                      {match.result === 'win' ? 'VICTOIRE' : match.result === 'loss' ? 'DÉFAITE' : 'NUL'}
                    </span>
                  </div>
                </div>
              </Card>
            </motion.div>
          ))}

          {history.length === 0 && (
            <div className="text-center py-12">
              <Trophy className="w-16 h-16 text-blue-400 mx-auto mb-4 opacity-50" />
              <p className="text-blue-200 text-lg">Aucun duel dans cette catégorie</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DuoHistory;
