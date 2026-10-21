import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  IonContent, IonHeader, IonToolbar, IonTitle, IonList, IonListHeader, IonItem, IonLabel, IonButton, IonIcon,
  IonFooter, IonThumbnail, IonImg, IonNote,
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import { addOutline, removeOutline, trashOutline, cartOutline, leafOutline } from 'ionicons/icons';
import { CarritoService } from '../core/cart.service';
import { CopPipe } from '../shared/format';

@Component({
  selector: 'app-carrito',
  imports: [RouterLink, IonContent, IonHeader, IonToolbar, IonTitle, IonList, IonListHeader, IonItem, IonLabel, IonButton,
    IonIcon, IonFooter, IonThumbnail, IonImg, IonNote, CopPipe],
  template: `
    <ion-header><ion-toolbar color="primary"><ion-title>Carrito</ion-title></ion-toolbar></ion-header>
    <ion-content>
      @if (carrito.items().length === 0) {
        <div class="vacio">
          <ion-icon name="cart-outline" color="medium" />
          <p>Tu carrito está vacío</p>
          <ion-button routerLink="/comprador/tabs/inicio">Ver productos</ion-button>
        </div>
      }
      <!-- Un grupo por finca: cada grupo será un pedido distinto -->
      @for (g of carrito.porProductor(); track g.finca) {
        <ion-list lines="full">
          <ion-list-header><ion-label>{{ g.finca }}</ion-label><ion-note>{{ g.subtotal | cop }}</ion-note></ion-list-header>
          @for (i of g.items; track i.producto.id) {
            <ion-item>
              <ion-thumbnail slot="start">
                @if (i.producto.miniaturaUrl) { <ion-img [src]="i.producto.miniaturaUrl" alt="" /> }
                @else { <div class="sin-foto"><ion-icon name="leaf-outline" /></div> }
              </ion-thumbnail>
              <ion-label>
                <h3>{{ i.producto.nombre }}</h3>
                <p>{{ i.producto.precio | cop }} / {{ i.producto.unidad }}</p>
              </ion-label>
              <div slot="end" class="cantidad">
                <ion-button fill="clear" size="small" (click)="carrito.cambiar(i.producto.id, i.cantidad - 1)" aria-label="Menos">
                  <ion-icon slot="icon-only" [name]="i.cantidad === 1 ? 'trash-outline' : 'remove-outline'" />
                </ion-button>
                <strong>{{ i.cantidad }}</strong>
                <ion-button fill="clear" size="small" (click)="carrito.cambiar(i.producto.id, i.cantidad + 1)" [disabled]="i.cantidad >= i.producto.stock" aria-label="Más">
                  <ion-icon slot="icon-only" name="add-outline" />
                </ion-button>
              </div>
            </ion-item>
          }
        </ion-list>
      }
    </ion-content>
    @if (carrito.items().length > 0) {
      <ion-footer class="ion-padding">
        <ion-button expand="block" size="large" routerLink="/comprador/checkout">Continuar · {{ carrito.total() | cop }}</ion-button>
      </ion-footer>
    }
  `,
  styles: `
    .vacio { text-align: center; margin-top: 30%; }
    .vacio ion-icon { font-size: 72px; }
    .cantidad { display: flex; align-items: center; }
    .sin-foto { display: grid; place-items: center; height: 100%; background: var(--ion-color-light); color: var(--ion-color-primary); font-size: 24px; }
  `,
})
export class CarritoPage {
  carrito = inject(CarritoService);
  constructor() {
    addIcons({ addOutline, removeOutline, trashOutline, cartOutline, leafOutline });
  }
}
