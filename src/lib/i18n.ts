export const translations = {
  es: {
    nav: {
      home: 'Inicio',
      activities: 'Actividades',
      contact: 'Contacto',
      chat: 'Chat',
      profile: 'Perfil',
      users: 'Usuarios',
      forms: 'Formularios',
      admin: 'Administrador del sitio',
      login: 'Ingresar',
      register: 'Registrarse',
      logout: 'Salir',
    },
  },
  pt: {
    nav: {
      home: 'Início',
      activities: 'Atividades',
      contact: 'Contato',
      chat: 'Bate-papo',
      profile: 'Perfil',
      users: 'Usuários',
      forms: 'Formulários',
      admin: 'Administrador do Site',
      login: 'Entrar',
      register: 'Registrar',
      logout: 'Sair',
    },
  },
  en: {
    nav: {
      home: 'Home',
      activities: 'Activities',
      contact: 'Contact',
      chat: 'Chat',
      profile: 'Profile',
      users: 'Users',
      forms: 'Forms',
      admin: 'Site Administrator',
      login: 'Login',
      register: 'Register',
      logout: 'Logout',
    },
  },
  fr: {
    nav: {
      home: 'Accueil',
      activities: 'Activités',
      contact: 'Contact',
      chat: 'Discussion',
      profile: 'Profil',
      users: 'Utilisateurs',
      forms: 'Formulaires',
      admin: 'Administrateur du Site',
      login: 'Connexion',
      register: 'Inscription',
      logout: 'Déconnexion',
    },
  },
};

export type Lang = keyof typeof translations;

export const availableLanguages: { code: Lang; flag: string; label: string }[] =
  [
    { code: 'es', flag: '🇪🇸', label: 'Español' },
    { code: 'pt', flag: '🇵🇹', label: 'Português' },
    { code: 'en', flag: '🇬🇧', label: 'English' },
    { code: 'fr', flag: '🇫🇷', label: 'Français' },
  ];

export const defaultLang: Lang = 'es';
