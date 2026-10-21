import { Component, inject, OnInit } from '@angular/core';
import { IonApp, IonRouterOutlet, Platform } from '@ionic/angular';
import { App as CapApp } from '@capacitor/app';
import { AvisosService } from './core/avisos.service';

@Component({
  selector: 'app-root',
  imports: [IonApp, IonRouterOutlet],
  template: `<ion-app><ion-router-outlet /></ion-app>`,
})
export class App implements OnInit {
  private platform = inject(Platform);
  private avisos = inject(AvisosService);

  ngOnInit() {
    // Botón atrás de Android en la raíz de una pestaña: preguntar antes de salir
    this.platform.backButton.subscribeWithPriority(-1, async () => {
      if (await this.avisos.confirmar('Salir', '¿Quieres cerrar Minga App?', 'Salir')) CapApp.exitApp();
    });
  }
}
