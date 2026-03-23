import React from 'react';
import { useTranslation } from '@/hooks/useTranslation';

const flags = { fr: '🇫🇷', en: '🇬🇧' };

const LanguageSwitcher = ({ className = '' }) => {
  const { lang, setLang } = useTranslation();
  const next = lang === 'fr' ? 'en' : 'fr';

  return (
    <button
      data-testid="language-switcher"
      onClick={() => setLang(next)}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-white hover:bg-white/20 transition-all text-sm ${className}`}
    >
      <span className="text-base">{flags[lang]}</span>
      <span className="font-medium uppercase">{lang}</span>
    </button>
  );
};

export default LanguageSwitcher;
