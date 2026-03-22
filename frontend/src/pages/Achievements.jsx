import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { ArrowLeft, Award, Lock, CheckCircle } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

const Achievements = () => {
  const navigate = useNavigate();
  const [achievements, setAchievements] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAchievements();
  }, []);

  const fetchAchievements = async () => {
    try {
      const response = await axios.get(
        `${BACKEND_URL}/api/achievements`,
        { withCredentials: true }
      );
      setAchievements(response.data);
      
      await axios.post(
        `${BACKEND_URL}/api/achievements/check`,
        {},
        { withCredentials: true }
      );
    } catch (error) {
      console.error('Erreur:', error);
    } finally {
      setLoading(false);
    }
  };

  const getCategoryColor = (category) => {
    const colors = {
      general: 'from-blue-400 to-blue-600',
      progression: 'from-purple-400 to-purple-600',
      quiz: 'from-emerald-400 to-emerald-600',
      mots: 'from-pink-400 to-pink-600',
      rapidite: 'from-orange-400 to-orange-600'
    };
    return colors[category] || 'from-gray-400 to-gray-600';
  };

  const earnedCount = achievements.filter(a => a.earned).length;
  const totalCount = achievements.length;
  const progress = totalCount > 0 ? (earnedCount / totalCount) * 100 : 0;

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
          <Award className="w-16 h-16 text-yellow-400 mx-auto mb-4" />
          <h1 className="text-4xl sm:text-5xl font-bold text-white mb-3" style={{ fontFamily: 'Fraunces, serif' }}>
            Achievements
          </h1>
          <p className="text-lg text-blue-200 mb-6">
            Débloquez des récompenses en jouant
          </p>
          
          <Card className="max-w-2xl mx-auto p-6 bg-white/10 backdrop-blur-md border-white/20">
            <div className="flex justify-between text-white mb-2">
              <span>Progression</span>
              <span className="font-bold">{earnedCount}/{totalCount}</span>
            </div>
            <Progress value={progress} className="h-3 bg-blue-950" />
          </Card>
        </motion.div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
          {achievements.map((achievement, index) => (
            <motion.div
              key={achievement.achievement_id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.05 }}
              data-testid={`achievement-${achievement.achievement_id}`}
            >
              <Card className={`p-6 bg-white/10 backdrop-blur-md border-white/20 h-full relative overflow-hidden ${
                achievement.earned ? 'ring-2 ring-yellow-400/50' : 'opacity-70'
              }`}>
                {achievement.earned && (
                  <div className="absolute top-4 right-4">
                    <CheckCircle className="w-6 h-6 text-emerald-400" />
                  </div>
                )}
                
                {!achievement.earned && (
                  <div className="absolute top-4 right-4">
                    <Lock className="w-5 h-5 text-blue-300" />
                  </div>
                )}

                <div className={`w-20 h-20 rounded-full bg-gradient-to-br ${getCategoryColor(achievement.category)} flex items-center justify-center text-4xl mx-auto mb-4`}>
                  {achievement.icon}
                </div>

                <h3 className="text-xl font-bold text-white mb-2 text-center">
                  {achievement.name}
                </h3>

                <p className="text-sm text-blue-200 text-center mb-4">
                  {achievement.description}
                </p>

                <div className="text-center">
                  <span className="inline-block px-3 py-1 rounded-full bg-white/10 text-yellow-400 text-sm font-semibold">
                    +{achievement.xp_reward} XP
                  </span>
                </div>

                {achievement.earned && achievement.earned_at && (
                  <p className="text-xs text-blue-300 text-center mt-3">
                    Débloqué le {new Date(achievement.earned_at).toLocaleDateString('fr-FR')}
                  </p>
                )}
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Achievements;
