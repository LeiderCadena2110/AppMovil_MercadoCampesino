import { Component, OnInit, inject, input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  IonContent, IonHeader, IonToolbar, IonButtons, IonBackButton, IonButton, IonIcon, IonImg,
  IonFooter, IonSpinner,
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import { addOutline, removeOutline, leafOutline, storefrontOutline, checkmarkCircle, chevronForward } from 'ionicons/icons';
import { CatalogoService } from '../core/catalog.service';
import { CarritoService } from '../core/cart.service';
import { AvisosService } from '../core/notifications.service';
import { Producto } from '../core/models';
import { CopPipe } from '../shared/format';

@Component({
  selector: 'app-producto-detalle',
  imports: [RouterLink, IonContent, IonHeader, IonToolbar, IonButtons, IonBackButton, IonButton, IonIcon, IonImg,
    IonFooter, IonSpinner, CopPipe],
  template: `
    <ion-header class="ion-no-border flotante"><ion-toolbar>
      <ion-buttons slot="start"><ion-back-button defaultHref="/comprador/tabs/inicio" text="" /></ion-buttons>
    </ion-toolbar></ion-header>
    <ion-content [fullscreen]="true">
      @if (producto(); as p) {
        <!-- La foto grande solo se descarga en el detalle (RNF-01) -->
        @if (p.fotoUrl) { <ion-img [src]="p.fotoUrl" [alt]="p.nombre" class="foto" /> }
        @else { <div class="foto sin-foto"><ion-icon name="leaf-outline" /></div> }

        <section class="hoja">
          <span class="categoria">{{ p.categoria?.nombre }}</span>
          <h1>{{ p.nombre }}</h1>
          <p class="precio">{{ p.precio | cop }} <small>por {{ p.unidad }}</small></p>
          <p class="stock" [class.pocas]="p.stock <= 5">
            {{ p.stock <= 5 ? 'Solo quedan' : 'Hay' }} <strong>{{ p.stock }} {{ p.unidad }}</strong> disponibles
          </p>
          @if (p.descripcion) { <p class="descripcion">{{ p.descripcion }}</p> }

          <button type="button" class="finca" [routerLink]="['/comprador/productor', p.productorId]">
            <span class="avatar"><ion-icon name="storefront-outline" /></span>
            <span class="datos">
              <strong>{{ p.productor?.nombreFinca }}
                @if (p.productor?.verificado) { <ion-icon name="checkmark-circle" color="success" aria-label="Finca verificada" /> }
              </strong>
              <small>{{ p.productor?.usuario?.nombre }} · {{ p.productor?.municipio?.nombre }}</small>
            </span>
            <ion-icon name="chevron-forward" class="ir" />
          </button>
        </section>
      } @else {
        <div class="ion-text-center ion-padding cargando"><ion-spinner /></div>
      }
    </ion-content>
    @if (producto(); as p) {
      <ion-footer class="ion-no-border pie">
        <div class="cantidad" role="group" aria-label="Cantidad">
          <button type="button" (click)="cantidad.set(cantidad() - 1)" [disabled]="cantidad() <= 1" aria-label="Menos"><ion-icon name="remove-outline" /></button>
          <strong>{{ cantidad() }}</strong>
          <button type="button" (click)="cantidad.set(cantidad() + 1)" [disabled]="cantidad() >= p.stock" aria-label="Más"><ion-icon name="add-outline" /></button>
        </div>
        <ion-button expand="block" size="large" color="tertiary" (click)="agregar(p)">Agregar · {{ +p.precio * cantidad() | cop }}</ion-button>
      </ion-footer>
    }
  `,
  styles: `
    .flotante ion-toolbar { --background: transparent; position: absolute; }
    .flotante ion-back-button { --background: var(--mc-superficie); --border-radius: 50%; margin-left: 8px; width: 44px; height: 44px; }
    .foto { display: block; width: 100%; height: 320px; object-fit: cover; }
    .sin-foto { display: grid; place-items: center; font-size: 84px; color: var(--ion-color-primary);
      background: color-mix(in srgb, var(--ion-color-primary) 9%, var(--mc-superficie)); }
    .hoja { position: relative; margin-top: -24px; padding: 22px 18px 24px; border-radius: var(--mc-radio-grande) var(--mc-radio-grande) 0 0;
      background: var(--ion-background-color); }
    .categoria { font-size: 0.85rem; font-weight: 700; color: var(--mc-barro); }
    h1 { margin: 4px 0 6px; font-size: 1.8rem; line-height: 1.1; }
    .precio { margin: 0; font-family: var(--mc-titulos); font-weight: 800; font-size: 1.6rem; color: var(--ion-color-primary); }
    .precio small { font-family: var(--ion-font-family); font-weight: 400; font-size: 0.95rem; color: var(--ion-color-medium); }
    .stock { margin: 8px 0 0; color: var(--ion-color-medium); }
    .stock.pocas { color: var(--mc-barro); }
    .descripcion { margin: 16px 0 0; line-height: 1.55; max-width: 60ch; }
    .finca { display: flex; align-items: center; gap: 12px; width: 100%; margin-top: 20px; padding: 14px; text-align: left;
      border-radius: var(--mc-radio); border: 1px solid var(--mc-borde); background: var(--mc-superficie); font: inherit; color: inherit; cursor: pointer; }
    .avatar { width: 46px; height: 46px; border-radius: 50%; display: grid; place-items: center; flex-shrink: 0;
      background: var(--mc-paramo); color: var(--mc-maiz); font-size: 22px; }
    .datos { flex: 1; }
    .datos strong { display: flex; align-items: center; gap: 4px; }
    .datos small { color: var(--ion-color-medium); }
    .ir { color: var(--ion-color-medium); }
    .cargando { margin-top: 40vh; }
    .pie { display: flex; gap: 12px; align-items: center; padding: 12px 16px calc(12px + var(--ion-safe-area-bottom, 0px));
      background: var(--mc-superficie); border-top: 1px solid var(--mc-borde); }
    .pie > ion-button { flex: 1; margin: 0; }
    .cantidad { display: flex; align-items: center; gap: 4px; border: 1px solid var(--mc-borde); border-radius: var(--mc-radio); padding: 4px; }
    .cantidad button { width: 44px; height: 44px; border: 0; border-radius: var(--mc-radio-chico); background: transparent;
      color: var(--ion-text-color); font-size: 20px; display: grid; place-items: center; cursor: pointer; }
    .cantidad button:disabled { opacity: 0.35; }
    .cantidad strong { min-width: 28px; text-align: center; font-size: 1.1rem; }
  `,
})
export class ProductoDetallePage implements OnInit {
  id = input.required<string>(); // viene de la ruta /comprador/producto/:id
  private catalogo = inject(CatalogoService);
  private carrito = inject(CarritoService);
  private avisos = inject(AvisosService);
  producto = signal<Producto | null>(null);
  cantidad = signal(1);

  constructor() {
    addIcons({ addOutline, removeOutline, leafOutline, storefrontOutline, checkmarkCircle, chevronForward });
  }

  async ngOnInit() {
    try { this.producto.set(await this.catalogo.producto(+this.id())); } catch (e) { this.avisos.error(e); }
  }

  agregar(p: Producto) {
    this.carrito.agregar({
      id: p.id, nombre: p.nombre, precio: p.precio, unidad: p.unidad, stock: p.stock, fotoUrl: p.fotoUrl,
      miniaturaUrl: p.fotoUrl, productorId: p.productorId, finca: p.productor?.nombreFinca ?? '',
      municipio: p.productor?.municipio?.nombre ?? '', categoria: p.categoria?.nombre ?? '',
    }, this.cantidad());
    this.avisos.exito('Agregado al carrito');
  }
}
