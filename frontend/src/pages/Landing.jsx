import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Sparkles, Trophy, Book, Crown } from 'lucide-react';
import { useTranslation } from '@/hooks/useTranslation';
import LanguageSwitcher from '@/components/LanguageSwitcher';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

const Landing = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();

  const handleLogin = () => {
    const redirectUrl = window.location.origin + '/dashboard';
    window.location.href = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirectUrl)}`;
  };

  const features = [
    { icon: <Book className="w-10 h-10 text-yellow-300" />, title: t('landing.feature_campaign'), description: t('landing.feature_campaign_desc') },
    { icon: <Trophy className="w-10 h-10 text-yellow-300" />, title: t('landing.feature_badges'), description: t('landing.feature_badges_desc') },
    { icon: <Crown className="w-10 h-10 text-yellow-300" />, title: t('landing.feature_premium'), description: t('landing.feature_premium_desc') },
  ];

  return (
    <div className="min-h-screen relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #1E3A8A 0%, #312E81 50%, #1E3A8A 100%)' }}>
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-20 left-10 w-72 h-72 bg-yellow-400 rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-purple-400 rounded-full blur-3xl" />
      </div>

      <div className="absolute top-4 right-4 z-20">
        <LanguageSwitcher />
      </div>
      
      <div className="relative z-10 container mx-auto px-4 py-12">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="text-center max-w-5xl mx-auto">
          <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} transition={{ duration: 0.5, delay: 0.2 }} className="mb-8">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-md border border-white/20 mb-6">
              <Sparkles className="w-4 h-4 text-yellow-300" />
              <span className="text-sm text-yellow-100 font-medium">{t('landing.tagline')}</span>
            </div>
          </motion.div>

          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold text-white mb-6 leading-tight" style={{ fontFamily: 'Fraunces, serif' }}>BibleQuest</h1>
          <p className="text-xl sm:text-2xl text-blue-100 mb-12 max-w-3xl mx-auto" style={{ fontFamily: 'Manrope, sans-serif' }}>{t('landing.subtitle')}</p>

          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <Button data-testid="login-button" onClick={handleLogin} size="lg" className="text-lg px-12 py-7 rounded-full bg-gradient-to-r from-yellow-400 to-yellow-600 hover:from-yellow-500 hover:to-yellow-700 text-gray-900 font-bold shadow-2xl border-2 border-yellow-300">
              <Crown className="w-5 h-5 mr-2" />
              {t('landing.cta')}
            </Button>
          </motion.div>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-8 mt-24 max-w-6xl mx-auto">
          {features.map((feature, index) => (
            <motion.div key={index} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.4 + index * 0.1 }} className="p-8 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 hover:bg-white/15 transition-all">
              <div className="mb-4">{feature.icon}</div>
              <h3 className="text-xl font-bold text-white mb-3" style={{ fontFamily: 'Manrope, sans-serif' }}>{feature.title}</h3>
              <p className="text-blue-100" style={{ fontFamily: 'Manrope, sans-serif' }}>{feature.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Landing;
