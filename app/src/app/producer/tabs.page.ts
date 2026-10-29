import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { IonTabs, IonTabBar, IonTabButton, IonIcon, IonLabel, IonBadge } from '@ionic/angular';
import { NovedadesPedidosService } from '../core/order-updates.service';
import { addIcons } from 'ionicons';
import { gridOutline, basketOutline, receiptOutline, personOutline } from 'ionicons/icons';

@Component({
  selector: 'app-productor-tabs',
  imports: [IonTabs, IonTabBar, IonTabButton, IonIcon, IonLabel, IonBadge],
  template: `
    <ion-tabs>
      <ion-tab-bar slot="bottom">
        <ion-tab-button tab="panel"><ion-icon name="grid-outline" /><ion-label>Panel</ion-label></ion-tab-button>
        <ion-tab-button tab="productos"><ion-icon name="basket-outline" /><ion-label>Mis productos</ion-label></ion-tab-button>
        <ion-tab-button tab="pedidos">
          <ion-icon name="receipt-outline" /><ion-label>Pedidos</ion-label>
          @if (novedades.novedades() > 0) { <ion-badge color="danger" [attr.aria-label]="novedades.novedades() + ' novedades'">{{ novedades.novedades() }}</ion-badge> }
        </ion-tab-button>
        <ion-tab-button tab="perfil"><ion-icon name="person-outline" /><ion-label>Perfil</ion-label></ion-tab-button>
      </ion-tab-bar>
    </ion-tabs>
  `,
})
export class ProductorTabsPage implements OnInit, OnDestroy {
  novedades = inject(NovedadesPedidosService);
  constructor() {
    addIcons({ gridOutline, basketOutline, receiptOutline, personOutline });
  }
  ngOnInit() {
    this.novedades.iniciar();
  }
  ngOnDestroy() {
    this.novedades.detener();
  }
}
