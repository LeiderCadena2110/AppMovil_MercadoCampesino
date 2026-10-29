import { Component, inject, OnInit, signal } from '@angular/core';
import { IonApp, IonRouterOutlet, Platform } from '@ionic/angular';
import { App as CapApp } from '@capacitor/app';
import { AvisosService } from './core/notifications.service';
import { SplashComponent } from './shared/splash.component';

@Component({
  selector: 'app-root',
  imports: [IonApp, IonRouterOutlet, SplashComponent],
  // La animación de entrada va encima; la app carga por debajo al mismo tiempo
  template: `
    <ion-app><ion-router-outlet /></ion-app>
    @if (mostrarSplash()) { <app-splash (listo)="mostrarSplash.set(false)" /> }
  `,
})
export class App implements OnInit {
  private platform = inject(Platform);
  private avisos = inject(AvisosService);
  mostrarSplash = signal(true);

  ngOnInit() {
    // Botón atrás de Android en la raíz de una pestaña: preguntar antes de salir
    this.platform.backButton.subscribeWithPriority(-1, async () => {
      if (await this.avisos.confirmar('Salir', '¿Quieres cerrar Minga App?', 'Salir')) CapApp.exitApp();
    });
  }
}
