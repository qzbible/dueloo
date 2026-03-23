import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import axios from 'axios';
import { useAuthStore } from '@/stores/authStore';
import { useTranslation } from '@/hooks/useTranslation';
import LanguageSwitcher from '@/components/LanguageSwitcher';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Sparkles, Trophy, Heart, Coins, Crown, BookOpen, Award, Zap, LogOut, Shield } from 'lucide-react';
import DailyMannaModal from '@/components/DailyMannaModal';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

const Dashboard = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { user, setUser, clearUser } = useAuthStore();
  const [badges, setBadges] = useState([]);
  const [dailyMannaStatus, setDailyMannaStatus] = useState({ can_play: false, streak: 0 });
  const [showDailyManna, setShowDailyManna] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchUserData(); }, []);

  const fetchUserData = async () => {
    try {
      const [userRes, badgesRes, dailyRes] = await Promise.all([
        axios.get(`${BACKEND_URL}/api/auth/me`, { withCredentials: true }),
        axios.get(`${BACKEND_URL}/api/badges`, { withCredentials: true }),
        axios.get(`${BACKEND_URL}/api/daily-manna/status`, { withCredentials: true })
      ]);
      setUser(userRes.data);
      setBadges(badgesRes.data);
      setDailyMannaStatus(dailyRes.data);
      if (dailyRes.data.can_play) setTimeout(() => setShowDailyManna(true), 1000);
    } catch (error) {
      if (error.response?.status === 401) navigate('/');
    } finally { setLoading(false); }
  };

  const handleLogout = async () => {
    try {
      await axios.post(`${BACKEND_URL}/api/auth/logout`, {}, { withCredentials: true });
      clearUser();
      navigate('/');
    } catch (error) { console.error(error); }
  };

  const xpForNextLevel = user ? user.level * 100 : 100;
  const xpProgress = user ? (user.xp / xpForNextLevel) * 100 : 0;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-900 to-purple-900">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-yellow-400 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-white text-lg">{t('dashboard.loading')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #1E3A8A 0%, #312E81 50%, #1E3A8A 100%)' }}>
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-20 left-10 w-72 h-72 bg-yellow-400 rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-purple-400 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <motion.h1 initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="text-4xl font-bold text-white" style={{ fontFamily: 'Fraunces, serif' }}>BibleQuest</motion.h1>
          <div className="flex items-center gap-3">
            <LanguageSwitcher />
            {user?.is_admin && (
              <Button data-testid="admin-panel-btn" onClick={() => navigate('/admin')} variant="outline" className="bg-yellow-400/10 border-yellow-400/30 text-yellow-400 hover:bg-yellow-400/20">
                <Shield className="w-4 h-4 mr-2" />Admin
              </Button>
            )}
            <Button data-testid="logout-button" onClick={handleLogout} variant="outline" className="bg-white/10 backdrop-blur-md border-white/20 text-white hover:bg-white/20">
              <LogOut className="w-4 h-4 mr-2" />{t('dashboard.logout')}
            </Button>
          </div>
        </div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <Card className="p-6 bg-white/10 backdrop-blur-md border-white/20">
            <div className="flex items-center gap-4 mb-4">
              <img src={user?.picture || 'https://via.placeholder.com/80'} alt={user?.name} className="w-20 h-20 rounded-full border-4 border-yellow-400" />
              <div className="flex-1">
                <h2 data-testid="user-name" className="text-2xl font-bold text-white mb-1" style={{ fontFamily: 'Manrope, sans-serif' }}>{user?.name}</h2>
                <div className="flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-yellow-400" />
                  <span data-testid="user-level" className="text-lg text-yellow-300 font-semibold">{t('dashboard.level')} {user?.level}</span>
                </div>
              </div>
              {user?.is_premium && (
                <div className="px-4 py-2 rounded-full bg-gradient-to-r from-yellow-400 to-yellow-600 text-gray-900 font-bold flex items-center gap-2">
                  <Crown className="w-4 h-4" />Premium
                </div>
              )}
            </div>
            <div className="mb-2">
              <div className="flex justify-between text-sm text-blue-200 mb-1">
                <span>{t('dashboard.progression')}</span>
                <span>{user?.xp} / {xpForNextLevel} XP</span>
              </div>
              <Progress value={xpProgress} className="h-3 bg-blue-950" />
            </div>
            <div className="grid grid-cols-3 gap-4 mt-4">
              <div className="text-center p-3 rounded-lg bg-white/5">
                <Heart className="w-6 h-6 text-red-400 mx-auto mb-1" />
                <div data-testid="user-lives" className="text-2xl font-bold text-white">{user?.lives}</div>
                <div className="text-xs text-blue-200">{t('dashboard.lives')}</div>
              </div>
              <div className="text-center p-3 rounded-lg bg-white/5">
                <Coins className="w-6 h-6 text-yellow-400 mx-auto mb-1" />
                <div data-testid="user-coins" className="text-2xl font-bold text-white">{user?.coins}</div>
                <div className="text-xs text-blue-200">{t('dashboard.coins')}</div>
              </div>
              <div className="text-center p-3 rounded-lg bg-white/5">
                <Zap className="w-6 h-6 text-purple-400 mx-auto mb-1" />
                <div className="text-2xl font-bold text-white">{dailyMannaStatus.streak}</div>
                <div className="text-xs text-blue-200">{t('dashboard.streak')}</div>
              </div>
            </div>
          </Card>
        </motion.div>

        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }}>
            <Card className="p-6 bg-white/10 backdrop-blur-md border-white/20 h-full hover:bg-white/15 transition-all cursor-pointer" onClick={() => navigate('/campaign')}>
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-2xl font-bold text-white mb-2" style={{ fontFamily: 'Manrope, sans-serif' }}>{t('dashboard.campaign_mode')}</h3>
                  <p className="text-blue-200">{t('dashboard.campaign_desc')}</p>
                </div>
                <BookOpen className="w-12 h-12 text-yellow-400" />
              </div>
              <Button data-testid="play-campaign-button" className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white">{t('dashboard.play_now')}</Button>
            </Card>
          </motion.div>
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 }}>
            <Card className="p-6 bg-white/10 backdrop-blur-md border-white/20 h-full hover:bg-white/15 transition-all cursor-pointer" onClick={() => navigate('/games')}>
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-2xl font-bold text-white mb-2" style={{ fontFamily: 'Manrope, sans-serif' }}>{t('dashboard.all_modes')}</h3>
                  <p className="text-blue-200">{t('dashboard.all_modes_desc')}</p>
                </div>
                <Sparkles className="w-12 h-12 text-yellow-400" />
              </div>
              <Button data-testid="all-games-button" className="w-full bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 text-white">{t('dashboard.discover')}</Button>
            </Card>
          </motion.div>
        </div>

        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.4 }}>
            <Card className="p-6 bg-white/10 backdrop-blur-md border-white/20 h-full hover:bg-white/15 transition-all cursor-pointer" onClick={() => navigate('/premium')}>
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-2xl font-bold text-white mb-2" style={{ fontFamily: 'Manrope, sans-serif' }}>{t('dashboard.become_premium')}</h3>
                  <p className="text-blue-200">{t('dashboard.premium_desc')}</p>
                </div>
                <Crown className="w-12 h-12 text-yellow-400" />
              </div>
              <Button data-testid="premium-button" className="w-full bg-gradient-to-r from-yellow-400 to-yellow-600 hover:from-yellow-500 hover:to-yellow-700 text-gray-900 font-bold">{t('dashboard.see_offers')}</Button>
            </Card>
          </motion.div>
        </div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
          <Card className="p-6 bg-white/10 backdrop-blur-md border-white/20">
            <h3 className="text-2xl font-bold text-white mb-4 flex items-center gap-2" style={{ fontFamily: 'Manrope, sans-serif' }}>
              <Award className="w-6 h-6 text-yellow-400" />{t('dashboard.your_badges')}
            </h3>
            {badges.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {badges.map((badge, index) => (
                  <motion.div key={badge.badge_id} initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.5 + index * 0.1 }} className="text-center p-4 rounded-lg bg-white/5 hover:bg-white/10 transition-all">
                    <div className="text-4xl mb-2">{badge.icon}</div>
                    <div className="text-white font-semibold text-sm">{badge.name}</div>
                    <div className="text-xs text-blue-200 mt-1">{badge.description}</div>
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Sparkles className="w-16 h-16 text-yellow-400 mx-auto mb-4 opacity-50" />
                <p className="text-blue-200">{t('dashboard.play_to_unlock')}</p>
              </div>
            )}
          </Card>
        </motion.div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-8">
          <Card onClick={() => navigate('/duo')} className="p-4 bg-white/10 backdrop-blur-md border-white/20 hover:bg-white/15 transition-all cursor-pointer">
            <div className="text-center">
              <div className="text-3xl mb-2">&#x2694;&#xFE0F;</div>
              <p className="text-white font-semibold">{t('dashboard.duo_mode')}</p>
              <p className="text-xs text-blue-200">{t('dashboard.duo_desc')}</p>
            </div>
          </Card>
          <Card onClick={() => navigate('/group')} className="p-4 bg-white/10 backdrop-blur-md border-white/20 hover:bg-white/15 transition-all cursor-pointer">
            <div className="text-center">
              <div className="text-3xl mb-2">&#x1F465;</div>
              <p className="text-white font-semibold">{t('dashboard.group_mode')}</p>
              <p className="text-xs text-blue-200">{t('dashboard.group_desc')}</p>
            </div>
          </Card>
          <Card onClick={() => navigate('/leaderboard')} className="p-4 bg-white/10 backdrop-blur-md border-white/20 hover:bg-white/15 transition-all cursor-pointer">
            <div className="text-center">
              <div className="text-3xl mb-2">&#x1F3C6;</div>
              <p className="text-white font-semibold">{t('dashboard.leaderboard')}</p>
              <p className="text-xs text-blue-200">{t('dashboard.top_players')}</p>
            </div>
          </Card>
          <Card onClick={() => navigate('/achievements')} className="p-4 bg-white/10 backdrop-blur-md border-white/20 hover:bg-white/15 transition-all cursor-pointer">
            <div className="text-center">
              <div className="text-3xl mb-2">&#x1F396;&#xFE0F;</div>
              <p className="text-white font-semibold">{t('dashboard.achievements')}</p>
              <p className="text-xs text-blue-200">{t('dashboard.rewards')}</p>
            </div>
          </Card>
        </div>
      </div>

      {showDailyManna && <DailyMannaModal onClose={() => setShowDailyManna(false)} onComplete={fetchUserData} />}
    </div>
  );
};

export default Dashboard;
