// Monitoreo de errores con Sentry. Se activa solo si existe SENTRY_DSN.
// Se carga antes que la API: `node --import ./src/instrument.js src/server.js`
import 'dotenv/config';
import * as Sentry from '@sentry/node';

if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.RENDER === 'true' ? 'produccion' : (process.env.NODE_ENV ?? 'desarrollo'),
    release: process.env.RENDER_GIT_COMMIT,
    tracesSampleRate: 0,     // solo errores, sin trazas de rendimiento (plan gratis)
    sendDefaultPii: false,   // no se envían IP, correos ni encabezados de sesión
  });
}
