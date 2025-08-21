'use client';

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import {
  translations,
  availableLanguages,
  defaultLang,
  type Lang,
} from '@/lib/i18n';

interface LangContext {
  lang: Lang;
  setLang: (l: Lang) => void;
}

const LanguageContext = createContext<LangContext>({
  lang: defaultLang,
  setLang: () => {},
});

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Lang>(defaultLang);

  useEffect(() => {
    const stored = localStorage.getItem('lang') as Lang | null;
    if (stored) setLang(stored);
  }, []);

  useEffect(() => {
    localStorage.setItem('lang', lang);
  }, [lang]);

  return (
    <LanguageContext.Provider value={{ lang, setLang }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLang() {
  return useContext(LanguageContext);
}

export function useTranslation() {
  const { lang } = useLang();
  return translations[lang];
}

export { availableLanguages };
