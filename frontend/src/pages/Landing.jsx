import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Sparkles, Crown, ArrowRight } from 'lucide-react';
import { useTranslation } from '@/hooks/useTranslation';
import LanguageSwitcher from '@/components/LanguageSwitcher';

const Landing = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();

  const handleLogin = () => {
    const redirectUrl = window.location.origin + '/dashboard';
    window.location.href = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirectUrl)}`;
  };



  return (
    <div className="min-h-screen relative overflow-hidden bg-[#0a0b1e]">
      {/* Dynamic Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] bg-blue-600/20 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[50%] h-[50%] bg-purple-600/20 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '1s' }} />
      </div>

      <div className="absolute top-6 right-6 z-50">
        <LanguageSwitcher />
      </div>
      
      <div className="relative z-10 container mx-auto px-6 py-20 lg:py-32">
        <motion.div 
          initial={{ opacity: 0, y: 30 }} 
          animate={{ opacity: 1, y: 0 }} 
          transition={{ duration: 0.8, ease: "easeOut" }} 
          className="text-center max-w-4xl mx-auto"
        >
          <motion.div 
            initial={{ scale: 0.8, opacity: 0 }} 
            animate={{ scale: 1, opacity: 1 }} 
            transition={{ duration: 0.5, delay: 0.3 }} 
            className="mb-10"
          >
            <div className="inline-flex items-center gap-3 px-5 py-2 rounded-full glass border border-white/20 mb-8">
              <Sparkles className="w-5 h-5 text-yellow-400" />
              <span className="text-sm text-blue-100 font-semibold tracking-wide uppercase italic">{t('landing.tagline')}</span>
            </div>
          </motion.div>

          <h1 className="text-6xl sm:text-8xl lg:text-9xl font-black text-white mb-8 tracking-tighter leading-none">
             Duel<span className="text-gradient">oo</span>
          </h1>
          
          <p className="text-xl sm:text-2xl text-blue-100/80 mb-14 max-w-2xl mx-auto leading-relaxed font-light">
            {t('landing.subtitle')}
          </p>

          <motion.div 
            whileHover={{ scale: 1.02 }} 
            whileTap={{ scale: 0.98 }}
            className="flex flex-col items-center justify-center gap-6"
          >
            <Button 
              data-testid="login-button" 
              onClick={handleLogin} 
              size="lg" 
              className="text-xl px-12 py-8 rounded-2xl bg-gradient-to-r from-yellow-400 via-yellow-500 to-yellow-600 hover:from-yellow-500 hover:to-yellow-700 text-slate-950 font-black shadow-[0_0_40px_rgba(234,179,8,0.3)] transition-all duration-300 border-b-4 border-yellow-700 w-full sm:w-auto"
            >
              <Crown className="w-6 h-6 mr-3" />
              {t('landing.cta')}
              <ArrowRight className="w-6 h-6 ml-3 opacity-50" />
            </Button>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
};

export default Landing;

