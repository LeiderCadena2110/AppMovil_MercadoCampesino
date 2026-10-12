import { Component, inject } from '@angular/core';
import {
  IonContent, IonHeader, IonToolbar, IonTitle, IonList, IonItem, IonLabel, IonButton, IonIcon, IonBadge, IonNote,
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import { personCircleOutline, logOutOutline } from 'ionicons/icons';
import { AuthService } from '../core/auth.service';
import { AvisosService } from '../core/avisos.service';

/** Perfil compartido por comprador y productor */
@Component({
  selector: 'app-perfil',
  imports: [IonContent, IonHeader, IonToolbar, IonTitle, IonList, IonItem, IonLabel, IonButton, IonIcon, IonBadge, IonNote],
  template: `
    <ion-header><ion-toolbar color="primary"><ion-title>Perfil</ion-title></ion-toolbar></ion-header>
    <ion-content class="ion-padding">
      @if (auth.usuario(); as u) {
        <div class="cabecera">
          <ion-icon name="person-circle-outline" color="primary" />
          <h2>{{ u.nombre }}</h2>
          <ion-note>{{ u.email }}</ion-note>
        </div>
        <ion-list lines="full" inset>
          <ion-item><ion-label>Celular</ion-label><ion-note slot="end">{{ u.telefono || 'Sin registrar' }}</ion-note></ion-item>
          <ion-item><ion-label>Tipo de cuenta</ion-label><ion-note slot="end">{{ u.rol === 'PRODUCTOR' ? 'Productor' : 'Comprador' }}</ion-note></ion-item>
          @if (u.productor; as p) {
            <ion-item><ion-label>Finca</ion-label><ion-note slot="end">{{ p.nombreFinca }}</ion-note></ion-item>
            <ion-item>
              <ion-label>Estado</ion-label>
              <ion-badge slot="end" [color]="p.verificado ? 'success' : 'warning'">{{ p.verificado ? 'Verificado' : 'En revisión' }}</ion-badge>
            </ion-item>
          }
        </ion-list>
      }
      <ion-button expand="block" color="danger" fill="outline" (click)="salir()">
        <ion-icon slot="start" name="log-out-outline" /> Cerrar sesión
      </ion-button>
    </ion-content>
  `,
  styles: `
    .cabecera { text-align: center; margin-bottom: 12px; }
    .cabecera ion-icon { font-size: 80px; }
    h2 { margin: 4px 0; }
  `,
})
export class PerfilPage {
  auth = inject(AuthService);
  private avisos = inject(AvisosService);
  constructor() {
    addIcons({ personCircleOutline, logOutOutline });
  }
  async salir() {
    if (await this.avisos.confirmar('Cerrar sesión', '¿Quieres salir de tu cuenta?', 'Salir')) await this.auth.salir();
  }
}
