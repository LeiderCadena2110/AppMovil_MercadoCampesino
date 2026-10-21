import { Component, input, output } from '@angular/core';
import { IonIcon, IonImg, IonRippleEffect } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { add, leafOutline, locationOutline } from 'ionicons/icons';
import { ProductoLista } from '../core/models';
import { CopPipe } from './formato';

@Component({
  selector: 'app-producto-card',
  imports: [IonIcon, IonImg, IonRippleEffect, CopPipe],
  template: `
    <article class="tarjeta ion-activatable" (click)="abrir.emit(producto())">
      <div class="foto">
        @if (producto().miniaturaUrl) {
          <ion-img [src]="producto().miniaturaUrl" [alt]="producto().nombre" />
        } @else {
          <div class="sin-foto"><ion-icon name="leaf-outline" /></div>
        }
        @if (producto().stock <= 5) { <span class="pocas">Quedan {{ producto().stock }}</span> }
      </div>
      <div class="info">
        <h3>{{ producto().nombre }}</h3>
        <p class="lugar"><ion-icon name="location-outline" />{{ producto().municipio }}</p>
        <div class="fila">
          <p class="precio">{{ producto().precio | cop }}<small>por {{ producto().unidad }}</small></p>
          <button type="button" class="agregar" (click)="$event.stopPropagation(); agregar.emit(producto())"
            [attr.aria-label]="'Agregar ' + producto().nombre + ' al carrito'">
            <ion-icon name="add" />
          </button>
        </div>
      </div>
      <ion-ripple-effect />
    </article>
  `,
  styles: `
    .tarjeta {
      position: relative; overflow: hidden; margin: 6px; cursor: pointer;
      background: var(--mc-superficie); border: 1px solid var(--mc-borde); border-radius: var(--mc-radio);
    }
    .foto { position: relative; aspect-ratio: 4 / 3; background: var(--ion-color-light); }
    .foto ion-img { width: 100%; height: 100%; object-fit: cover; }
    .sin-foto { height: 100%; display: grid; place-items: center; font-size: 40px; color: var(--ion-color-primary); }
    .pocas {
      position: absolute; left: 8px; bottom: 8px; padding: 3px 8px; border-radius: 999px;
      background: var(--mc-superficie); color: var(--mc-barro); font-size: 11px; font-weight: 700;
    }
    .info { padding: 10px 10px 10px 12px; }
    h3 { font-size: 0.95rem; line-height: 1.2; margin: 0; color: var(--ion-text-color);
      display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
    .lugar { display: flex; align-items: center; gap: 3px; margin: 4px 0 8px; font-size: 0.78rem; color: var(--mc-barro); }
    .fila { display: flex; justify-content: space-between; align-items: end; gap: 6px; }
    .precio { margin: 0; font-family: var(--mc-titulos); font-weight: 800; font-size: 1.05rem; color: var(--ion-text-color); }
    .precio small { display: block; font-family: var(--ion-font-family); font-weight: 400; font-size: 0.75rem; color: var(--ion-color-medium); }
    .agregar {
      width: 40px; height: 40px; border-radius: 50%; border: 0; display: grid; place-items: center; flex-shrink: 0;
      background: var(--mc-maiz); color: #1f2a12; font-size: 22px; cursor: pointer;
    }
    .agregar:active { transform: scale(0.92); }
  `,
})
export class ProductoCardComponent {
  producto = input.required<ProductoLista>();
  abrir = output<ProductoLista>();
  agregar = output<ProductoLista>();
  constructor() {
    addIcons({ add, leafOutline, locationOutline });
  }
}
