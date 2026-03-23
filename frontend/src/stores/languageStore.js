import { create } from 'zustand';

const getBrowserLanguage = () => {
  const lang = navigator.language || navigator.userLanguage || 'fr';
  const short = lang.split('-')[0].toLowerCase();
  return ['fr', 'en'].includes(short) ? short : 'fr';
};

export const useLanguageStore = create((set, get) => ({
  lang: localStorage.getItem('bq_lang') || getBrowserLanguage(),
  setLang: (lang) => {
    localStorage.setItem('bq_lang', lang);
    set({ lang });
  },
}));
