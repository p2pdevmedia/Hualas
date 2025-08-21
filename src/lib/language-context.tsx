'use client';

import { createContext, useContext, useState, ReactNode } from 'react';

export const languages = {
  es: { label: 'Español', flag: '🇪🇸' },
  en: { label: 'English', flag: '🇺🇸' },
  pt: { label: 'Português', flag: '🇧🇷' },
  fr: { label: 'Français', flag: '🇫🇷' },
} as const;

export type Language = keyof typeof languages;

const translations: Record<Language, Record<string, string>> = {
  es: {
    home: 'Inicio',
    activities: 'Actividades',
    contact: 'Contacto',
    chat: 'Chat',
    users: 'Usuarios',
    forms: 'Formularios',
    login: 'Iniciar sesión',
    register: 'Registrarse',
    logout: 'Cerrar sesión',
    welcome: 'Bienvenido al Club Hualas',
    enroll: 'Inscribirse',
    followUs: '¡Seguinos en Instagram!',
    clubName: 'Club Social y Deportivo Hualas Patagónico.',
    clubLocation: '⛰️San Martín de los Andes, Neuquén, Patagonia Argentina. 🇦🇷',
  },
  en: {
    home: 'Home',
    activities: 'Activities',
    contact: 'Contact',
    chat: 'Chat',
    users: 'Users',
    forms: 'Forms',
    login: 'Login',
    register: 'Register',
    logout: 'Logout',
    welcome: 'Welcome to Club Hualas',
    enroll: 'Enroll',
    followUs: 'Follow us on Instagram!',
    clubName: 'Hualas Patagónico Social and Sports Club.',
    clubLocation: '⛰️San Martín de los Andes, Neuquén, Argentine Patagonia. 🇦🇷',
  },
  pt: {
    home: 'Início',
    activities: 'Atividades',
    contact: 'Contato',
    chat: 'Chat',
    users: 'Usuários',
    forms: 'Formulários',
    login: 'Entrar',
    register: 'Registrar',
    logout: 'Sair',
    welcome: 'Bem-vindo ao Clube Hualas',
    enroll: 'Inscrever-se',
    followUs: 'Siga-nos no Instagram!',
    clubName: 'Clube Social e Esportivo Hualas Patagônico.',
    clubLocation: '⛰️San Martín de los Andes, Neuquén, Patagônia Argentina. 🇦🇷',
  },
  fr: {
    home: 'Accueil',
    activities: 'Activités',
    contact: 'Contact',
    chat: 'Chat',
    users: 'Utilisateurs',
    forms: 'Formulaires',
    login: 'Connexion',
    register: 'Inscription',
    logout: 'Déconnexion',
    welcome: 'Bienvenue au Club Hualas',
    enroll: "S'inscrire",
    followUs: 'Suivez-nous sur Instagram !',
    clubName: 'Club Social et Sportif Hualas Patagónico.',
    clubLocation: '⛰️San Martín de los Andes, Neuquén, Patagonie argentine. 🇦🇷',
  },
};

interface LanguageContextProps {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextProps | undefined>(undefined);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<Language>('es');

  const t = (key: string) => translations[language][key] || key;

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within LanguageProvider');
  }
  return context;
}

