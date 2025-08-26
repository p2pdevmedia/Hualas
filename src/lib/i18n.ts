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
      notifications: 'Notificaciones',
      admin: 'Administrador del sitio',
      login: 'Ingresar',
      register: 'Inscribirse',
      logout: 'Salir',
    },
    home: {
      welcome: 'Bienvenido a Club Hualas',
    },
    actions: {
      view: 'Ver',
      edit: 'Editar',
      childEnrollment: 'Inscripción de menores',
      resetPassword: 'Restablecer contraseña',
      delete: 'Eliminar',
    },
    auth: {
      showPassword: 'Mostrar contraseña',
      invalidCredentials: 'Credenciales inválidas',
      signIn: 'Iniciar sesión',
      signInWithGoogle: 'Iniciar sesión con Google',
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
      notifications: 'Notificações',
      admin: 'Administrador do Site',
      login: 'Entrar',
      register: 'Inscrever-se',
      logout: 'Sair',
    },
    home: {
      welcome: 'Bem-vindo ao Club Hualas',
    },
    actions: {
      view: 'Ver',
      edit: 'Editar',
      childEnrollment: 'Inscrição de crianças',
      resetPassword: 'Redefinir senha',
      delete: 'Excluir',
    },
    auth: {
      showPassword: 'Mostrar senha',
      invalidCredentials: 'Credenciais inválidas',
      signIn: 'Entrar',
      signInWithGoogle: 'Entrar com Google',
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
      notifications: 'Notifications',
      admin: 'Site Administrator',
      login: 'Login',
      register: 'Register',
      logout: 'Logout',
    },
    home: {
      welcome: 'Welcome to Club Hualas',
    },
    actions: {
      view: 'View',
      edit: 'Edit',
      childEnrollment: 'Child enrollment',
      resetPassword: 'Reset password',
      delete: 'Delete',
    },
    auth: {
      showPassword: 'Show password',
      invalidCredentials: 'Invalid credentials',
      signIn: 'Sign in',
      signInWithGoogle: 'Sign in with Google',
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
      notifications: 'Notifications',
      admin: 'Administrateur du Site',
      login: 'Connexion',
      register: "S'inscrire",
      logout: 'Déconnexion',
    },
    home: {
      welcome: 'Bienvenue au Club Hualas',
    },
    actions: {
      view: 'Voir',
      edit: 'Modifier',
      childEnrollment: 'Inscription des enfants',
      resetPassword: 'Réinitialiser le mot de passe',
      delete: 'Supprimer',
    },
    auth: {
      showPassword: 'Afficher le mot de passe',
      invalidCredentials: 'Identifiants invalides',
      signIn: 'Se connecter',
      signInWithGoogle: 'Se connecter avec Google',
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
