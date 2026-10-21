import { Component, inject } from '@angular/core';
import { IonTabs, IonTabBar, IonTabButton, IonIcon, IonLabel, IonBadge } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { homeOutline, searchOutline, cartOutline, receiptOutline, personOutline } from 'ionicons/icons';
import { CarritoService } from '../core/cart.service';

@Component({
  selector: 'app-comprador-tabs',
  imports: [IonTabs, IonTabBar, IonTabButton, IonIcon, IonLabel, IonBadge],
  template: `
    <ion-tabs>
      <ion-tab-bar slot="bottom">
        <ion-tab-button tab="inicio"><ion-icon name="home-outline" /><ion-label>Inicio</ion-label></ion-tab-button>
        <ion-tab-button tab="buscar"><ion-icon name="search-outline" /><ion-label>Buscar</ion-label></ion-tab-button>
        <ion-tab-button tab="carrito">
          <ion-icon name="cart-outline" /><ion-label>Carrito</ion-label>
          @if (carrito.cantidad() > 0) { <ion-badge color="danger">{{ carrito.cantidad() }}</ion-badge> }
        </ion-tab-button>
        <ion-tab-button tab="pedidos"><ion-icon name="receipt-outline" /><ion-label>Pedidos</ion-label></ion-tab-button>
        <ion-tab-button tab="perfil"><ion-icon name="person-outline" /><ion-label>Perfil</ion-label></ion-tab-button>
      </ion-tab-bar>
    </ion-tabs>
  `,
})
export class CompradorTabsPage {
  carrito = inject(CarritoService);
  constructor() {
    addIcons({ homeOutline, searchOutline, cartOutline, receiptOutline, personOutline });
  }
}
