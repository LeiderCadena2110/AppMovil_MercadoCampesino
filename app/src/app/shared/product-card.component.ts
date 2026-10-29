import { Component, input, output, signal } from '@angular/core';
import { IonIcon } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { add, leafOutline, locationOutline, checkmarkCircle } from 'ionicons/icons';
import { ProductoLista } from '../core/models';
import { CopPipe, UnidadPipe } from './format';

/** Tarjeta del catálogo: foto, nombre, precio por unidad, cantidad, procedencia y productor */
@Component({
  selector: 'app-producto-card',
  imports: [IonIcon, CopPipe, UnidadPipe],
  template: `
    <article class="tarjeta">
      <button type="button" class="foto" (click)="abrir.emit(producto())" [attr.aria-label]="'Ver ' + producto().nombre">
        @if (producto().miniaturaUrl && !fotoFallo()) {
          <img [src]="producto().miniaturaUrl" [alt]="producto().nombre" loading="lazy" decoding="async" (error)="fotoFallo.set(true)" />
        } @else {
          <span class="sin-foto"><ion-icon name="leaf-outline" /><small>Sin foto</small></span>
        }
        @if (producto().stock <= 5) { <span class="mc-sello destaque pocas">Quedan {{ producto().stock }}</span> }
      </button>

      <div class="info">
        <h3>{{ producto().nombre }}</h3>
        <p class="precio">{{ producto().precio | cop }} <small>/ {{ producto().unidad }}</small></p>
        <p class="stock">Hay {{ producto().stock }} {{ producto().unidad | unidad: producto().stock }}</p>
        <p class="origen">
          <ion-icon name="location-outline" aria-hidden="true" />
          <span>{{ producto().municipio }}</span>
        </p>
        <p class="quien">
          {{ producto().finca }}@if (producto().productor) { · {{ producto().productor }} }
          @if (producto().verificado) { <ion-icon name="checkmark-circle" class="ok" aria-label="Finca verificada" /> }
        </p>
        <div class="acciones">
          <button type="button" class="ver mc-tocable" (click)="abrir.emit(producto())">Ver y comprar</button>
          <button type="button" class="mc-boton-redondo mc-tocable" (click)="agregar.emit(producto())"
            [attr.aria-label]="'Agregar ' + producto().nombre + ' al carrito'">
            <ion-icon name="add" />
          </button>
        </div>
      </div>
    </article>
  `,
  styles: `
    .tarjeta { display: flex; flex-direction: column; height: calc(100% - 12px); margin: 6px; overflow: hidden;
      background: var(--mc-superficie); border: 1px solid var(--mc-borde); border-radius: var(--mc-radio); }
    .foto { position: relative; display: block; width: 100%; aspect-ratio: 4 / 3; padding: 0; border: 0; cursor: pointer;
      background: var(--mc-suelo); }
    .foto img { width: 100%; height: 100%; object-fit: cover; display: block; }
    .sin-foto { height: 100%; display: grid; place-content: center; justify-items: center; gap: 2px; color: var(--mc-arcilla); font-size: 34px; }
    .sin-foto small { font-size: 0.72rem; font-weight: 700; }
    .pocas { position: absolute; left: 8px; bottom: 8px; }
    .info { display: flex; flex-direction: column; flex: 1; padding: 10px 10px 10px 12px; }
    h3 { font-size: 0.98rem; line-height: 1.2; margin: 0 0 4px; color: var(--ion-text-color);
      display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
    .precio { margin: 0; font-family: var(--mc-titulos); font-weight: 800; font-size: 1.1rem; color: var(--ion-text-color); }
    .precio small { font-family: var(--ion-font-family); font-weight: 400; font-size: 0.8rem; color: var(--mc-tinta-suave); }
    .stock { margin: 1px 0 6px; font-size: 0.78rem; color: var(--mc-tinta-suave); }
    .origen, .quien { margin: 0; font-size: 0.8rem; line-height: 1.3; }
    .origen { display: flex; align-items: center; gap: 3px; color: var(--mc-barro); font-weight: 700; }
    .quien { color: var(--mc-tinta-suave); display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
    .quien .ok { color: var(--ion-color-success); vertical-align: -2px; }
    .acciones { display: flex; gap: 6px; align-items: center; margin-top: auto; padding-top: 10px; }
    .ver { flex: 1; min-width: 0; height: 44px; border-radius: 12px; border: 1.5px solid var(--mc-accion); background: transparent;
      color: var(--mc-accion); font: inherit; font-weight: 700; font-size: 0.85rem; cursor: pointer; }
  `,
})
export class ProductoCardComponent {
  producto = input.required<ProductoLista>();
  abrir = output<ProductoLista>();
  agregar = output<ProductoLista>();
  fotoFallo = signal(false);
  constructor() {
    addIcons({ add, leafOutline, locationOutline, checkmarkCircle });
  }
}
