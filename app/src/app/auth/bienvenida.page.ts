import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IonContent, IonButton, IonIcon, IonText } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { leaf } from 'ionicons/icons';

@Component({
  selector: 'app-bienvenida',
  imports: [IonContent, IonButton, IonIcon, IonText, RouterLink],
  template: `
    <ion-content class="ion-padding">
      <div class="centro">
        <ion-icon name="leaf" color="primary" class="logo" />
        <h1>Mercado Campesino</h1>
        <ion-text color="medium">
          <p>Compra directo a los campesinos de Nariño, sin intermediarios.</p>
        </ion-text>
        <ion-button expand="block" size="large" routerLink="/login">Iniciar sesión</ion-button>
        <ion-button expand="block" size="large" fill="outline" routerLink="/registro">Crear cuenta</ion-button>
      </div>
    </ion-content>
  `,
  styles: `
    .centro { min-height: 100%; display: flex; flex-direction: column; justify-content: center; text-align: center; gap: 8px; }
    .logo { font-size: 88px; align-self: center; }
    h1 { font-weight: 700; margin: 0; }
    p { margin: 0 0 24px; font-size: 17px; }
  `,
})
export class BienvenidaPage {
  constructor() {
    addIcons({ leaf });
  }
}
