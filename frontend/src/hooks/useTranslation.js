import { useLanguageStore } from '@/stores/languageStore';
import fr from '@/i18n/fr.json';
import en from '@/i18n/en.json';

const translations = { fr, en };

export const useTranslation = () => {
  const { lang, setLang } = useLanguageStore();
  const t = (key) => {
    const keys = key.split('.');
    let val = translations[lang];
    for (const k of keys) {
      val = val?.[k];
      if (val === undefined) break;
    }
    if (val === undefined) {
      let fallback = translations.fr;
      for (const k of keys) { fallback = fallback?.[k]; }
      return fallback || key;
    }
    return val;
  };
  return { t, lang, setLang };
};
