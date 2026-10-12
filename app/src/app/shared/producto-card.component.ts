import { Component, input, output } from '@angular/core';
import { IonCard, IonCardContent, IonButton, IonIcon, IonImg, IonText } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { cartOutline, leafOutline } from 'ionicons/icons';
import { ProductoLista } from '../core/models';
import { CopPipe } from './formato';

@Component({
  selector: 'app-producto-card',
  imports: [IonCard, IonCardContent, IonButton, IonIcon, IonImg, IonText, CopPipe],
  template: `
    <ion-card class="tarjeta" button (click)="abrir.emit(producto())">
      @if (producto().miniaturaUrl) {
        <ion-img [src]="producto().miniaturaUrl" [alt]="producto().nombre" />
      } @else {
        <div class="sin-foto"><ion-icon name="leaf-outline" /></div>
      }
      <ion-card-content>
        <h3>{{ producto().nombre }}</h3>
        <ion-text color="medium"><p>{{ producto().finca }} · {{ producto().municipio }}</p></ion-text>
        <div class="fila">
          <strong>{{ producto().precio | cop }} <small>/ {{ producto().unidad }}</small></strong>
          <ion-button size="small" (click)="$event.stopPropagation(); agregar.emit(producto())" aria-label="Agregar al carrito">
            <ion-icon slot="icon-only" name="cart-outline" />
          </ion-button>
        </div>
      </ion-card-content>
    </ion-card>
  `,
  styles: `
    .tarjeta { margin: 6px; }
    ion-img, .sin-foto { height: 120px; object-fit: cover; }
    .sin-foto { display: grid; place-items: center; background: var(--ion-color-light); font-size: 40px; color: var(--ion-color-primary); }
    h3 { font-size: 15px; font-weight: 600; margin: 0 0 2px; color: var(--ion-text-color); }
    p { font-size: 12px; margin: 0 0 6px; }
    .fila { display: flex; justify-content: space-between; align-items: center; }
    small { font-weight: 400; color: var(--ion-color-medium); }
  `,
})
export class ProductoCardComponent {
  producto = input.required<ProductoLista>();
  abrir = output<ProductoLista>();
  agregar = output<ProductoLista>();
  constructor() {
    addIcons({ cartOutline, leafOutline });
  }
}
