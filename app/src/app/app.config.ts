import { ApplicationConfig, inject, provideAppInitializer, provideZoneChangeDetection } from '@angular/core';
import { RouteReuseStrategy, provideRouter, withComponentInputBinding, withPreloading, PreloadAllModules } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { IonicRouteStrategy, provideIonicAngular } from '@ionic/angular';
import { routes } from './app.routes';
import { authInterceptor } from './core/auth.interceptor';
import { AuthService } from './core/auth.service';
import { CarritoService } from './core/carrito.service';

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    { provide: RouteReuseStrategy, useClass: IonicRouteStrategy },
    provideIonicAngular({ mode: 'md' }),
    // withComponentInputBinding: el :id de la ruta llega como input() del componente
    provideRouter(routes, withComponentInputBinding(), withPreloading(PreloadAllModules)),
    provideHttpClient(withInterceptors([authInterceptor])),
    // Antes de mostrar la primera pantalla: recuperar sesión y carrito guardados
    // (inject() debe llamarse antes de cualquier await)
    provideAppInitializer(() => {
      const auth = inject(AuthService);
      const carrito = inject(CarritoService);
      return Promise.all([auth.cargar(), carrito.cargar()]);
    }),
  ],
};
