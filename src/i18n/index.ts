import { createI18n } from 'vue-i18n';

const messages = {
  en: {
    app: {
      name: 'Performance Management System',
    },
    home: {
      title: 'Welcome',
      scaffold: 'Frontend scaffold is installed and ready. Feature pages will be added in a later pass.',
      env: 'Environment',
      api: 'API base URL',
    },
    notFound: {
      title: 'Page not found',
      back: 'Back to home',
    },
  },
  fr: {
    app: {
      name: 'Système de gestion des performances',
    },
    home: {
      title: 'Bienvenue',
      scaffold: 'Échafaudage frontend installé et prêt. Les pages fonctionnelles seront ajoutées dans une prochaine étape.',
      env: 'Environnement',
      api: 'URL de base de l’API',
    },
    notFound: {
      title: 'Page introuvable',
      back: 'Retour à l’accueil',
    },
  },
};

export default createI18n({
  legacy: false,
  locale: 'en',
  fallbackLocale: 'en',
  messages,
});