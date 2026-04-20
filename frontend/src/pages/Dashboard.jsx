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
import { Sparkles, Trophy, Heart, Coins, Crown, BookOpen, Award, Zap, LogOut, Shield, ChevronRight } from 'lucide-react';
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
      <div className="min-h-screen flex items-center justify-center bg-[#0a0b1e]">
        <div className="w-16 h-16 border-4 border-yellow-500/20 border-t-yellow-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen relative overflow-hidden bg-[#0a0b1e] text-blue-100/90 pb-20">
      {/* Background Orbs */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-[-10%] right-[-5%] w-[40%] h-[40%] bg-blue-600/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] left-[-5%] w-[40%] h-[40%] bg-purple-600/10 rounded-full blur-[120px]" />
      </div>

      <div className="relative z-10 container mx-auto px-6 py-10">
        <div className="flex justify-between items-center mb-12">
          <motion.h1 
            initial={{ opacity: 0, x: -20 }} 
            animate={{ opacity: 1, x: 0 }} 
            className="text-4xl font-black text-white tracking-tight"
          >
            Bible<span className="text-gradient">Quest</span>
          </motion.h1>
          <div className="flex items-center gap-4">
            <LanguageSwitcher />
            {user?.is_admin && (
              <Button onClick={() => navigate('/admin')} className="glass-dark border-yellow-500/30 text-yellow-400 hover:bg-yellow-500/10">
                <Shield className="w-4 h-4 mr-2" />Admin
              </Button>
            )}
            <Button onClick={handleLogout} variant="ghost" className="text-blue-300 hover:text-white hover:bg-white/5">
              <LogOut className="w-4 h-4 mr-2" />{t('dashboard.logout')}
            </Button>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-8 mb-12">
          {/* User Profile Card */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="lg:col-span-2">
            <Card className="p-8 glass h-full">
              <div className="flex flex-col md:flex-row items-center gap-8 mb-8">
                <div className="relative group">
                  <div className="absolute inset-0 bg-yellow-500 blur-xl opacity-20 group-hover:opacity-40 transition-opacity" />
                  <img src={user?.picture || 'https://via.placeholder.com/120'} alt={user?.name} className="relative w-32 h-32 rounded-3xl border-4 border-white/10 object-cover shadow-2xl" />
                  {user?.is_premium && (
                    <div className="absolute -top-3 -right-3 w-10 h-10 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-xl flex items-center justify-center shadow-lg transform rotate-12">
                      <Crown className="w-6 h-6 text-black" />
                    </div>
                  )}
                </div>
                <div className="flex-1 text-center md:text-left">
                  <h2 className="text-4xl font-black text-white mb-2 leading-none">{user?.name}</h2>
                  <div className="flex flex-wrap justify-center md:justify-start items-center gap-4 text-blue-200">
                    <span className="flex items-center gap-2 px-3 py-1 rounded-lg glass-dark text-yellow-400 font-bold">
                      <Trophy className="w-5 h-5" /> {t('dashboard.level')} {user?.level}
                    </span>
                    <span className="text-blue-100/60 font-medium tracking-wide uppercase text-xs">Apostre en devenir</span>
                  </div>
                </div>
              </div>

              <div className="mb-8">
                <div className="flex justify-between text-sm font-bold text-blue-200/60 mb-3 uppercase tracking-wider">
                  <span>{t('dashboard.progression')}</span>
                  <span className="text-blue-100">{user?.xp} / {xpForNextLevel} XP</span>
                </div>
                <div className="h-4 bg-white/5 rounded-full overflow-hidden p-1 border border-white/5">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${xpProgress}%` }}
                    className="h-full bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full shadow-[0_0_15px_rgba(59,130,246,0.5)]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-6">
                <div className="glass-dark p-5 rounded-2xl border-white/5 text-center group hover:bg-white/10 transition-all">
                  <Heart className="w-8 h-8 text-red-500 mx-auto mb-2 drop-shadow-[0_0_8px_rgba(239,68,68,0.4)] transform group-hover:scale-110 transition-transform" />
                  <div className="text-3xl font-black text-white">{user?.lives}</div>
                  <div className="text-xs font-bold text-blue-200/40 uppercase tracking-widest">{t('dashboard.lives')}</div>
                </div>
                <div className="glass-dark p-5 rounded-2xl border-white/5 text-center group hover:bg-white/10 transition-all">
                  <Coins className="w-8 h-8 text-yellow-500 mx-auto mb-2 drop-shadow-[0_0_8px_rgba(234,179,8,0.4)] transform group-hover:scale-110 transition-transform" />
                  <div className="text-3xl font-black text-white">{user?.coins}</div>
                  <div className="text-xs font-bold text-blue-200/40 uppercase tracking-widest">{t('dashboard.coins')}</div>
                </div>
                <div className="glass-dark p-5 rounded-2xl border-white/5 text-center group hover:bg-white/10 transition-all">
                  <Zap className="w-8 h-8 text-purple-500 mx-auto mb-2 drop-shadow-[0_0_8px_rgba(168,85,247,0.4)] transform group-hover:scale-110 transition-transform" />
                  <div className="text-3xl font-black text-white">{dailyMannaStatus.streak}</div>
                  <div className="text-xs font-bold text-blue-200/40 uppercase tracking-widest">{t('dashboard.streak')}</div>
                </div>
              </div>
            </Card>
          </motion.div>

          {/* Featured Action Card */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <Card className="p-8 bg-gradient-to-br from-indigo-600 to-blue-700 h-full border-none shadow-[0_20px_50px_rgba(30,58,138,0.3)] relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl transform translate-x-32 -translate-y-32" />
              <div className="relative z-10 flex flex-col h-full">
                <div className="mb-auto">
                  <Sparkles className="w-16 h-16 text-yellow-400 mb-6 drop-shadow-xl animate-bounce" />
                  <h3 className="text-3xl font-black text-white mb-4 leading-none">{t('dashboard.all_modes')}</h3>
                  <p className="text-blue-100 text-lg font-medium leading-relaxed opacity-90">{t('dashboard.all_modes_desc')}</p>
                </div>
                <Button 
                  onClick={() => navigate('/games')} 
                  className="w-full h-16 bg-white text-indigo-700 hover:bg-blue-50 font-black text-xl rounded-2xl mt-8 shadow-xl group-hover:scale-[1.02] active:scale-95 transition-all"
                >
                  {t('dashboard.discover')} <ChevronRight className="w-6 h-6 ml-2" />
                </Button>
              </div>
            </Card>
          </motion.div>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          {[
            { title: t('dashboard.duo_mode'), desc: t('dashboard.duo_desc'), icon: '⚔️', path: '/duo', color: 'from-orange-500 to-red-600' },
            { title: t('dashboard.group_mode'), desc: t('dashboard.group_desc'), icon: '👥', path: '/group', color: 'from-emerald-500 to-teal-600' },
            { title: t('dashboard.leaderboard'), desc: t('dashboard.top_players'), icon: '🏆', path: '/leaderboard', color: 'from-blue-500 to-indigo-600' },
            { title: t('dashboard.achievements'), desc: t('dashboard.rewards'), icon: '🏅', path: '/achievements', color: 'from-purple-500 to-pink-600' }
          ].map((item, idx) => (
            <motion.div 
              key={idx}
              initial={{ opacity: 0, scale: 0.9 }} 
              animate={{ opacity: 1, scale: 1 }} 
              transition={{ delay: 0.3 + idx * 0.1 }}
            >
              <Card 
                onClick={() => navigate(item.path)} 
                className="p-6 glass hover:bg-white/15 cursor-pointer transition-all duration-300 group h-full border-white/5"
              >
                <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${item.color} flex items-center justify-center text-3xl mb-4 shadow-lg group-hover:scale-110 transition-transform`}>
                  {item.icon}
                </div>
                <h4 className="text-xl font-black text-white mb-2">{item.title}</h4>
                <p className="text-blue-100/50 text-sm font-medium">{item.desc}</p>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Badges Section */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
          <Card className="p-8 glass border-white/5">
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-2xl font-black text-white flex items-center gap-3">
                <Award className="w-8 h-8 text-yellow-500" />{t('dashboard.your_badges')}
              </h3>
              <Button variant="ghost" className="text-blue-300 font-bold hover:text-white" onClick={() => navigate('/achievements')}>
                Voir plus <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
            {badges.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-4 text-center">
                {badges.map((badge, index) => (
                  <motion.div 
                    key={badge.badge_id} 
                    initial={{ opacity: 0, scale: 0.5 }} 
                    animate={{ opacity: 1, scale: 1 }} 
                    transition={{ delay: 0.6 + index * 0.05 }} 
                    className="p-4 rounded-2xl glass-dark border-white/5 group hover:bg-white/10 transition-all cursor-help"
                    title={badge.description}
                  >
                    <div className="text-4xl mb-2 drop-shadow-md group-hover:scale-125 transition-transform duration-300">{badge.icon}</div>
                    <div className="text-white font-black text-[10px] uppercase tracking-tighter leading-tight">{badge.name}</div>
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="text-center py-16 glass-dark rounded-3xl border-dashed border-white/10">
                <Sparkles className="w-16 h-16 text-yellow-500/20 mx-auto mb-4" />
                <p className="text-blue-200/50 font-bold">{t('dashboard.play_to_unlock')}</p>
              </div>
            )}
          </Card>
        </motion.div>
      </div>

      {showDailyManna && <DailyMannaModal onClose={() => setShowDailyManna(false)} onComplete={fetchUserData} />}
    </div>
  );
};

export default Dashboard;

