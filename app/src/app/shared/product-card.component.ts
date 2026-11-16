import { Component, ElementRef, ViewChild, computed, inject, input, output, signal } from '@angular/core';
import { TransicionesService } from '../core/transitions.service';
import { IonIcon } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { add, remove, leafOutline, locationOutline, checkmarkCircle, heart, heartOutline } from 'ionicons/icons';
import { ProductoLista } from '../core/models';
import { FavoritosService } from '../core/favorites.service';
import { CarritoService } from '../core/cart.service';
import { CopPipe, UnidadPipe } from './format';

/**
 * Tarjeta del catálogo "Tierra viva": la foto flota (1:1, sombra suave) con el precio encima;
 * debajo, nombre, procedencia y un contador que agrega al carrito sin salir del catálogo.
 * Tocar la foto o el nombre abre el detalle para ver y comprar.
 */
@Component({
  selector: 'app-producto-card',
  imports: [IonIcon, CopPipe, UnidadPipe],
  template: `
    <article class="tarjeta">
      <div class="foto-caja">
        <button type="button" class="foto" (click)="ver()" [attr.aria-label]="'Ver y comprar ' + producto().nombre">
          @if (producto().miniaturaUrl && !fotoFallo()) {
            <img #fotoImg [src]="producto().miniaturaUrl" [alt]="producto().nombre" loading="lazy" decoding="async"
              (error)="fotoFallo.set(true)" />
          } @else {
            <span class="sin-foto"><ion-icon name="leaf-outline" /><small>Sin foto</small></span>
          }
          <span class="precio mc-num">{{ producto().precio | cop }}<small>/{{ producto().unidad }}</small></span>
          @if (producto().stock <= 5) { <span class="pocas">Quedan {{ producto().stock }}</span> }
        </button>
        <button type="button" class="corazon mc-tocable" [class.activo]="favoritos.es(producto().id)" (click)="favoritos.alternar(producto().id)"
          [attr.aria-pressed]="favoritos.es(producto().id)"
          [attr.aria-label]="(favoritos.es(producto().id) ? 'Quitar de favoritos ' : 'Guardar en favoritos ') + producto().nombre">
          <ion-icon [name]="favoritos.es(producto().id) ? 'heart' : 'heart-outline'" />
        </button>
      </div>

      <button type="button" class="texto" (click)="ver()">
        <h3>{{ producto().nombre }}</h3>
        <p class="origen">
          <ion-icon name="location-outline" aria-hidden="true" />
          <span>{{ producto().municipio }} · {{ producto().finca }}</span>
          @if (producto().verificado) { <ion-icon name="checkmark-circle" class="ok" aria-label="Finca verificada" /> }
        </p>
        <p class="stock">{{ producto().stock }} {{ producto().unidad | unidad: producto().stock }} disponibles</p>
      </button>

      @if (enCarrito() === 0) {
        <button type="button" class="agregar mc-tocable" (click)="sumar($event)" [attr.aria-label]="'Agregar ' + producto().nombre + ' al carrito'">
          <ion-icon name="add" /> Agregar
        </button>
      } @else {
        <div class="contador" role="group" [attr.aria-label]="'Cantidad de ' + producto().nombre + ' en el carrito'">
          <button type="button" class="mc-tocable" (click)="restar()" aria-label="Quitar uno"><ion-icon name="remove" /></button>
          <strong class="mc-num" aria-live="polite">{{ enCarrito() }}</strong>
          <button type="button" class="mc-tocable" (click)="sumar($event)" [disabled]="enCarrito() >= producto().stock" aria-label="Agregar uno"><ion-icon name="add" /></button>
        </div>
      }
    </article>
  `,
  styles: `
    .tarjeta { display: flex; flex-direction: column; height: 100%; padding: 6px 6px 14px; }
    .foto-caja { position: relative; }
    .foto { position: relative; display: block; width: 100%; aspect-ratio: 1; padding: 0; border: 0; cursor: pointer; overflow: hidden;
      border-radius: var(--mc-radio); background: var(--mc-suelo); box-shadow: var(--mc-e2); transition: transform 180ms var(--mc-curva); }
    .foto:active { transform: scale(0.98); }
    .foto img { width: 100%; height: 100%; object-fit: cover; display: block; }
    .sin-foto { height: 100%; display: grid; place-content: center; justify-items: center; gap: 2px; color: var(--mc-arcilla); font-size: 34px; }
    .sin-foto small { font-size: 0.72rem; font-weight: 700; }
    /* Precio sobre la foto, en vidrio esmerilado */
    .precio { position: absolute; left: 8px; bottom: 8px; display: inline-flex; align-items: baseline; gap: 2px; padding: 5px 10px; border-radius: 999px;
      background: rgb(255 255 255 / 0.82); backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px);
      color: #18221b; font-weight: 800; font-size: 0.95rem; box-shadow: var(--mc-e1); }
    .precio small { font-family: var(--ion-font-family); font-weight: 400; font-size: 0.72rem; color: #5b665e; }
    .pocas { position: absolute; left: 8px; top: 8px; padding: 3px 9px; border-radius: 999px; font-size: 0.72rem; font-weight: 700;
      background: var(--mc-destaque); color: var(--mc-destaque-texto); }
    .corazon { position: absolute; top: 8px; right: 8px; width: 38px; height: 38px; border-radius: 50%; border: 0; cursor: pointer;
      display: grid; place-items: center; font-size: 19px; background: rgb(255 255 255 / 0.82); color: #18221b;
      backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px); }
    .corazon.activo { color: #c62828; }
    .texto { display: block; width: 100%; padding: 10px 2px 0; border: 0; background: none; text-align: left; font: inherit; color: inherit; cursor: pointer; }
    h3 { font-size: 0.98rem; line-height: 1.25; margin: 0 0 4px; font-weight: 700; font-family: var(--ion-font-family); color: var(--ion-text-color);
      display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
    .origen { display: flex; align-items: center; gap: 3px; margin: 0; font-size: 0.78rem; color: var(--mc-barro); font-weight: 700; min-width: 0; }
    .origen span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .origen .ok { color: var(--ion-color-success); flex-shrink: 0; }
    .stock { margin: 3px 0 0; font-size: 0.76rem; color: var(--mc-tinta-suave);
      display: -webkit-box; -webkit-line-clamp: 1; -webkit-box-orient: vertical; overflow: hidden; }
    .agregar, .contador { margin-top: auto; }
    .agregar { display: flex; align-items: center; justify-content: center; gap: 6px; width: 100%; height: 42px; margin-top: 10px; border: 0;
      border-radius: 999px; background: color-mix(in srgb, var(--mc-accion) 14%, var(--mc-superficie)); color: var(--mc-accion);
      font: inherit; font-weight: 700; font-size: 0.9rem; cursor: pointer; }
    .contador { display: flex; align-items: center; justify-content: space-between; height: 42px; margin-top: 10px; padding: 3px;
      border-radius: 999px; background: color-mix(in srgb, var(--mc-accion) 14%, var(--mc-superficie)); }
    .contador button { width: 36px; height: 36px; border-radius: 50%; border: 0; display: grid; place-items: center; font-size: 18px; cursor: pointer;
      background: var(--mc-accion); color: var(--mc-accion-texto); }
    .contador button:disabled { opacity: 0.4; }
    .contador strong { font-size: 1.05rem; }
  `,
})
export class ProductoCardComponent {
  producto = input.required<ProductoLista>();
  abrir = output<ProductoLista>();
  /** Se emite al sumar al carrito (para animaciones o avisos de quien use la tarjeta) */
  agregar = output<{ producto: ProductoLista; origen: HTMLElement | null }>();
  fotoFallo = signal(false);
  favoritos = inject(FavoritosService);
  private carrito = inject(CarritoService);
  private transiciones = inject(TransicionesService);
  /** La imagen de la tarjeta (si cargó) para la transición compartida */
  @ViewChild('fotoImg') fotoImg?: ElementRef<HTMLImageElement>;

  enCarrito = computed(() => this.carrito.items().find((i) => i.producto.id === this.producto().id)?.cantidad ?? 0);

  constructor() {
    addIcons({ add, remove, leafOutline, locationOutline, checkmarkCircle, heart, heartOutline });
  }

  sumar(ev?: Event) {
    this.carrito.agregar(this.producto(), 1);
    this.agregar.emit({ producto: this.producto(), origen: (ev?.target as HTMLElement | null) ?? null });
  }

  /** Abre el detalle; la foto viaja hasta la del detalle */
  ver() {
    this.abrir.emit(this.producto());
    this.transiciones.abrirProducto(this.producto(), this.fotoImg?.nativeElement ?? null);
  }

  restar() {
    this.carrito.cambiar(this.producto().id, this.enCarrito() - 1);
  }
}
