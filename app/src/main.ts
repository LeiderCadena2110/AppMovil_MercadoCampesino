import { ocultarIconosDecorativos } from './app/core/accessibility';
import { bootstrapApplication } from '@angular/platform-browser';
import { registerLocaleData } from '@angular/common';
import localeEsCo from '@angular/common/locales/es-CO';
import { ErrorHandler, LOCALE_ID } from '@angular/core';
import * as Sentry from '@sentry/angular';
import { environment } from './environments/environment';
import { appConfig } from './app/app.config';
import { App } from './app/app';

registerLocaleData(localeEsCo);

// Monitoreo de errores: solo si el build trae un DSN (variable SENTRY_DSN_APP en GitHub)
const conSentry = !!environment.sentryDsn;
if (conSentry) {
  Sentry.init({
    dsn: environment.sentryDsn,
    environment: environment.nombre,
    tracesSampleRate: 0,
    // Los errores de red esperados (sin internet, 4xx) no se reportan
    ignoreErrors: ['Http failure response', 'Sin conexión'],
  });
}

ocultarIconosDecorativos();

bootstrapApplication(App, {
  ...appConfig,
  providers: [
    ...appConfig.providers,
    { provide: LOCALE_ID, useValue: 'es-CO' },
    ...(conSentry ? [{ provide: ErrorHandler, useValue: Sentry.createErrorHandler() }] : []),
  ],
}).catch((err) => console.error(err));
