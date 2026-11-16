import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  IonContent, IonHeader, IonToolbar, IonList, IonItem, IonItemSliding, IonItemOptions, IonItemOption,
  IonButton, IonIcon, IonFooter,
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import { addOutline, removeOutline, trashOutline, cartOutline, leafOutline, checkmarkCircle, locationOutline } from 'ionicons/icons';
import { EstadoVacioComponent } from '../shared/empty-state.component';
import { CarritoService, ItemCarrito } from '../core/cart.service';
import { AvisosService } from '../core/notifications.service';
import { vibrar } from '../core/haptics';
import { CopPipe } from '../shared/format';

/** Iniciales de la finca para el avatar ("Finca El Encano" → "EE") */
function iniciales(finca: string) {
  const palabras = finca.replace(/^finca\s+/i, '').split(/\s+/).filter((p) => p.length > 2 || /^[A-ZÁÉÍÓÚÑ]/.test(p));
  return (palabras.slice(0, 2).map((p) => p[0]).join('') || finca[0] || '?').toUpperCase();
}

@Component({
  selector: 'app-carrito',
  imports: [RouterLink, IonContent, IonHeader, IonToolbar, IonList, IonItem, IonItemSliding, IonItemOptions, IonItemOption,
    IonButton, IonIcon, IonFooter, CopPipe, EstadoVacioComponent],
  template: `
    <ion-header class="ion-no-border"><ion-toolbar>
      <div class="cabecera">
        <h1>Tu canasta</h1>
        @if (carrito.cantidad() > 0) {
          <p>{{ carrito.cantidad() }} {{ carrito.cantidad() === 1 ? 'producto' : 'productos' }}
            · {{ carrito.porProductor().length }} {{ carrito.porProductor().length === 1 ? 'finca' : 'fincas' }}</p>
        }
      </div>
    </ion-toolbar></ion-header>

    <ion-content>
      @if (carrito.items().length === 0) {
        <app-estado-vacio escena="canasta" titulo="Tu canasta está vacía"
          texto="Agrega productos del catálogo; cada finca recibe su propio pedido.">
          <ion-button routerLink="/comprador/tabs/inicio">Ver productos</ion-button>
        </app-estado-vacio>
      } @else {
        @if (carrito.porProductor().length > 1) {
          <p class="nota">Tu compra llega en {{ carrito.porProductor().length }} pedidos, uno por finca. Desliza un producto para quitarlo.</p>
        } @else {
          <p class="nota">Desliza un producto hacia la izquierda para quitarlo.</p>
        }

        <!-- Un grupo por finca: cada grupo será un pedido distinto -->
        @for (g of carrito.porProductor(); track g.productorId) {
          <section class="finca mc-flotante">
            <header>
              <span class="avatar" aria-hidden="true">{{ iniciales(g.finca) }}</span>
              <span class="quien">
                <strong>{{ g.finca }}
                  @if (g.verificado) { <ion-icon name="checkmark-circle" class="verificada" aria-label="Finca verificada" /> }
                </strong>
                <small><ion-icon name="location-outline" /> {{ g.municipio }}@if (g.productor) { · {{ g.productor }} }</small>
              </span>
              <span class="subtotal mc-num">{{ g.subtotal | cop }}</span>
            </header>

            <ion-list lines="none">
              @for (i of g.items; track i.producto.id) {
                <ion-item-sliding (ionSwipe)="quitar(i)">
                  <ion-item>
                    <div class="fila">
                      <span class="mini">
                        @if (i.producto.miniaturaUrl) { <img [src]="i.producto.miniaturaUrl" alt="" loading="lazy" /> }
                        @else { <ion-icon name="leaf-outline" /> }
                      </span>
                      <span class="datos">
                        <strong>{{ i.producto.nombre }}</strong>
                        <small class="mc-num">{{ i.producto.precio | cop }} / {{ i.producto.unidad }}</small>
                        <span class="linea mc-num">{{ +i.producto.precio * i.cantidad | cop }}</span>
                      </span>
                      <span class="contador" role="group" [attr.aria-label]="'Cantidad de ' + i.producto.nombre">
                        <button type="button" class="mc-tocable" (click)="menos(i)"
                          [attr.aria-label]="i.cantidad === 1 ? 'Quitar ' + i.producto.nombre : 'Quitar una ' + i.producto.unidad">
                          <ion-icon [name]="i.cantidad === 1 ? 'trash-outline' : 'remove-outline'" />
                        </button>
                        <strong class="mc-num" aria-live="polite">{{ i.cantidad }}</strong>
                        <button type="button" class="mc-tocable" (click)="mas(i)" [disabled]="i.cantidad >= i.producto.stock"
                          [attr.aria-label]="'Agregar una ' + i.producto.unidad">
                          <ion-icon name="add-outline" />
                        </button>
                      </span>
                    </div>
                  </ion-item>
                  <ion-item-options side="end">
                    <ion-item-option color="danger" expandable (click)="quitar(i)">
                      <ion-icon slot="top" name="trash-outline" /> Quitar
                    </ion-item-option>
                  </ion-item-options>
                </ion-item-sliding>
              }
            </ion-list>
          </section>
        }
      }
    </ion-content>

    @if (carrito.items().length > 0) {
      <ion-footer class="ion-no-border pie">
        <div class="total"><span>Total</span><strong class="mc-num">{{ carrito.total() | cop }}</strong></div>
        <ion-button expand="block" size="large" routerLink="/comprador/checkout">Continuar con la compra</ion-button>
      </ion-footer>
    }
  `,
  styles: `
    .cabecera { padding: 10px 16px 6px; }
    h1 { margin: 0; font-size: 1.7rem; }
    .cabecera p { margin: 2px 0 0; color: var(--mc-tinta-suave); font-weight: 600; }
    .nota { margin: 4px 16px 12px; color: var(--mc-tinta-suave); font-size: 0.9rem; }
    .finca { margin: 0 16px 16px; overflow: hidden; }
    .finca header { display: flex; align-items: center; gap: 12px; padding: 14px 14px 8px; }
    .avatar { width: 44px; height: 44px; flex-shrink: 0; border-radius: 50%; display: grid; place-items: center;
      background: var(--mc-suelo); color: var(--mc-barro); font-family: var(--mc-titulos); font-weight: 800; }
    .quien { display: grid; min-width: 0; flex: 1; }
    .quien strong { display: flex; align-items: center; gap: 4px; }
    .quien small { color: var(--mc-tinta-suave); display: flex; align-items: center; gap: 3px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .verificada { color: var(--ion-color-success); }
    .subtotal { font-weight: 800; }
    ion-list { padding: 0 0 6px; background: transparent; }
    ion-item { --background: var(--mc-superficie); --padding-start: 14px; --inner-padding-end: 14px; --min-height: 84px; }
    .fila { display: flex; align-items: center; gap: 12px; width: 100%; padding: 8px 0; }
    .mini { width: 60px; height: 60px; flex-shrink: 0; border-radius: var(--mc-radio-chico); overflow: hidden; display: grid; place-items: center;
      background: var(--mc-suelo); color: var(--mc-arcilla); font-size: 24px; }
    .mini img { width: 100%; height: 100%; object-fit: cover; }
    .datos { display: grid; gap: 1px; flex: 1; min-width: 0; }
    .datos strong { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .datos small { color: var(--mc-tinta-suave); }
    .linea { font-weight: 700; }
    .contador { display: flex; align-items: center; gap: 2px; border-radius: 999px; background: var(--mc-suelo); }
    .contador button { width: 40px; height: 40px; border: 0; border-radius: 50%; background: none; color: var(--mc-accion);
      display: grid; place-items: center; font-size: 18px; cursor: pointer; }
    .contador button:disabled { opacity: 0.35; }
    .contador strong { min-width: 20px; text-align: center; }
    .pie { padding: 12px 16px calc(12px + var(--ion-safe-area-bottom, 0px)); background: var(--mc-superficie); box-shadow: var(--mc-e2); }
    .total { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 8px; }
    .total span { color: var(--mc-tinta-suave); font-weight: 600; }
    .total strong { font-size: 1.4rem; }
  `,
})
export class CarritoPage {
  carrito = inject(CarritoService);
  private avisos = inject(AvisosService);
  iniciales = iniciales;

  constructor() {
    addIcons({ addOutline, removeOutline, trashOutline, cartOutline, leafOutline, checkmarkCircle, locationOutline });
  }

  mas(i: ItemCarrito) {
    vibrar.toque();
    this.carrito.cambiar(i.producto.id, i.cantidad + 1);
  }

  menos(i: ItemCarrito) {
    if (i.cantidad === 1) return this.quitar(i);
    vibrar.toque();
    this.carrito.cambiar(i.producto.id, i.cantidad - 1);
  }

  /** Quita el producto y ofrece "Deshacer" para devolverlo a su lugar */
  quitar(i: ItemCarrito) {
    const posicion = this.carrito.items().findIndex((x) => x.producto.id === i.producto.id);
    if (posicion < 0) return;
    vibrar.aviso();
    this.carrito.quitar(i.producto.id);
    this.avisos.deshacer(`Quitaste ${i.producto.nombre}`, () => this.carrito.restaurar(i, posicion));
  }
}
