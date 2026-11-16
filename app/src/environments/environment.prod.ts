// URL de la API publicada (se usa en `ng build`, el APK y la versión web).
// GitHub Actions la reemplaza con la variable del repositorio API_URL si existe
// (Settings > Secrets and variables > Actions > Variables).
export const environment = {
  apiUrl: 'https://minga-app-api.onrender.com/api',
  nombre: 'produccion',
  // GitHub Actions lo reemplaza con la variable SENTRY_DSN_APP si existe
  sentryDsn: '',
  // GitHub Actions lo pone en true si existe el secreto GOOGLE_SERVICES_JSON (notificaciones push)
  push: false,
};
