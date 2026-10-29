import { Component, OnInit, inject, input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  IonContent, IonHeader, IonToolbar, IonButtons, IonBackButton, IonButton, IonIcon,
  IonFooter, IonSpinner,
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
  addOutline, removeOutline, leafOutline, storefrontOutline, checkmarkCircle, chevronForward, heart, heartOutline, locationOutline,
  bicycleOutline, informationCircleOutline, cloudOfflineOutline,
} from 'ionicons/icons';
import { CatalogoService, aLista } from '../core/catalog.service';
import { FavoritosService } from '../core/favorites.service';
import { CatalogoListaComponent } from './catalog-list.component';
import { EstadoVacioComponent } from '../shared/empty-state.component';
import { CarritoService } from '../core/cart.service';
import { AvisosService } from '../core/notifications.service';
import { Producto, ProductoLista } from '../core/models';
import { CopPipe, UnidadPipe } from '../shared/format';

@Component({
  selector: 'app-producto-detalle',
  imports: [RouterLink, IonContent, IonHeader, IonToolbar, IonButtons, IonBackButton, IonButton, IonIcon,
    IonFooter, IonSpinner, CopPipe, UnidadPipe, CatalogoListaComponent, EstadoVacioComponent],
  template: `
    <ion-header class="ion-no-border flotante"><ion-toolbar>
      <ion-buttons slot="start"><ion-back-button defaultHref="/comprador/tabs/inicio" text="" /></ion-buttons>
      @if (producto(); as p) {
        <ion-buttons slot="end">
          <button type="button" class="corazon mc-tocable" [class.activo]="favoritos.es(p.id)" (click)="favoritos.alternar(p.id)"
            [attr.aria-pressed]="favoritos.es(p.id)" [attr.aria-label]="favoritos.es(p.id) ? 'Quitar de favoritos' : 'Guardar en favoritos'">
            <ion-icon [name]="favoritos.es(p.id) ? 'heart' : 'heart-outline'" />
          </button>
        </ion-buttons>
      }
    </ion-toolbar></ion-header>
    <ion-content [fullscreen]="true">
      @if (producto(); as p) {
        <!-- La foto grande solo se descarga en el detalle (RNF-01) -->
        @if (p.fotoUrl && !fotoFallo()) { <img [src]="p.fotoUrl" [alt]="p.nombre" class="foto" (error)="fotoFallo.set(true)" /> }
        @else { <div class="foto sin-foto"><ion-icon name="leaf-outline" /><small>Sin foto</small></div> }

        <section class="hoja">
          <span class="categoria">{{ p.categoria?.nombre }}</span>
          <h1>{{ p.nombre }}</h1>
          <p class="precio">{{ p.precio | cop }} <small>por {{ p.unidad }}</small></p>
          @if (p.stock > 0 && p.activo) {
            <p class="stock" [class.pocas]="p.stock <= 5">
              {{ p.stock <= 5 ? 'Solo quedan' : 'Hay' }} <strong>{{ p.stock }} {{ p.unidad | unidad: p.stock }}</strong> disponibles
            </p>
          } @else {
            <p class="stock pocas"><strong>No disponible por ahora.</strong> Guárdalo en favoritos y revisa más tarde.</p>
          }
          @if (p.descripcion) { <p class="descripcion">{{ p.descripcion }}</p> }

          <!-- Procedencia: de dónde viene y quién lo cultiva -->
          <h2 class="sub">De dónde viene</h2>
          <button type="button" class="finca" [routerLink]="['/comprador/productor', p.productorId]">
            <span class="avatar">{{ iniciales(p.productor?.nombreFinca) }}</span>
            <span class="datos">
              <strong>{{ p.productor?.nombreFinca }}
                @if (p.productor?.verificado) { <ion-icon name="checkmark-circle" color="success" aria-label="Finca verificada" /> }
              </strong>
              <small><ion-icon name="location-outline" /> {{ p.productor?.municipio?.nombre }}, {{ p.productor?.municipio?.departamento }}</small>
              <small>Cultivado por {{ p.productor?.usuario?.nombre }}</small>
            </span>
            <ion-icon name="chevron-forward" class="ir" />
          </button>
          @if (p.productor?.descripcion) { <p class="sobre-finca">“{{ p.productor?.descripcion }}”</p> }

          <!-- Entrega -->
          <h2 class="sub">Entrega</h2>
          <ul class="entrega">
            <li><ion-icon name="bicycle-outline" /> <span><strong>Te lo llevan</strong> y pagas al recibir (contra entrega).</span></li>
            <li><ion-icon name="storefront-outline" /> <span><strong>O lo recoges</strong> en la finca, sin costo de envío.</span></li>
            <li><ion-icon name="information-circle-outline" /> <span>El costo del envío se acuerda con el productor después de hacer el pedido.</span></li>
          </ul>
        </section>

        @if (relacionados().length) {
          <h2 class="sub relacionados">Más {{ (p.categoria?.nombre ?? 'productos').toLowerCase() }} de la región</h2>
          <app-catalogo-lista [productos]="relacionados()" />
        }
      } @else if (fallo()) {
        <app-estado-vacio tipo="error" icono="cloud-offline-outline" titulo="No pudimos cargar el producto"
          texto="Puede que ya no esté publicado o que no haya conexión.">
          <ion-button (click)="cargar()">Reintentar</ion-button>
        </app-estado-vacio>
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
        <ion-button expand="block" size="large" [disabled]="p.stock < 1 || !p.activo" (click)="agregar(p)">
          {{ p.stock < 1 || !p.activo ? 'Agotado' : 'Agregar · ' + (+p.precio * cantidad() | cop) }}
        </ion-button>
      </ion-footer>
    }
  `,
  styles: `
    .flotante ion-toolbar { --background: transparent; position: absolute; }
    .flotante ion-back-button { --background: var(--mc-superficie); --border-radius: 50%; margin-left: 8px; width: 44px; height: 44px; }
    .foto { display: block; width: 100%; height: 320px; object-fit: cover; }
    .sin-foto { display: grid; place-content: center; justify-items: center; font-size: 84px; color: var(--mc-arcilla); background: var(--mc-suelo); }
    .hoja { position: relative; margin-top: -24px; padding: 22px 18px 24px; border-radius: var(--mc-radio-grande) var(--mc-radio-grande) 0 0;
      background: var(--ion-background-color); }
    .categoria { font-size: 0.85rem; font-weight: 700; color: var(--mc-barro); }
    h1 { margin: 4px 0 6px; font-size: 1.8rem; line-height: 1.1; }
    .precio { margin: 0; font-family: var(--mc-titulos); font-weight: 800; font-size: 1.6rem; color: var(--ion-text-color); }
    .precio small { font-family: var(--ion-font-family); font-weight: 400; font-size: 0.95rem; color: var(--ion-color-medium); }
    .stock { margin: 8px 0 0; color: var(--ion-color-medium); }
    .stock.pocas { color: var(--mc-barro); }
    .descripcion { margin: 16px 0 0; line-height: 1.55; max-width: 60ch; }
    .flotante ion-buttons[slot='end'] { margin-right: 8px; }
    .corazon { width: 44px; height: 44px; border-radius: 50%; border: 0; display: grid; place-items: center; font-size: 22px;
      background: var(--mc-superficie); color: var(--ion-text-color); cursor: pointer; }
    .corazon.activo { color: #c62828; }
    .sin-foto small { display: block; font-size: 0.85rem; font-weight: 700; color: var(--mc-arcilla); }
    .sub { font-size: 1.05rem; margin: 22px 0 8px; }
    .relacionados { margin: 4px 16px 6px; }
    .sobre-finca { margin: 10px 0 0; padding: 0 4px; font-style: italic; color: var(--mc-tinta-suave); line-height: 1.5; }
    .entrega { list-style: none; margin: 0; padding: 0; display: grid; gap: 10px; }
    .entrega li { display: flex; gap: 10px; align-items: flex-start; font-size: 0.92rem; line-height: 1.4; }
    .entrega ion-icon { font-size: 22px; color: var(--mc-arcilla); flex-shrink: 0; }
    .datos small { display: flex; align-items: center; gap: 3px; }
    .finca { display: flex; align-items: center; gap: 12px; width: 100%; margin-top: 0; padding: 14px; text-align: left;
      border-radius: var(--mc-radio); border: 1px solid var(--mc-borde); background: var(--mc-superficie); font: inherit; color: inherit; cursor: pointer; }
    .avatar { width: 46px; height: 46px; border-radius: 50%; display: grid; place-items: center; flex-shrink: 0;
      background: var(--mc-marca); color: var(--mc-destaque); font-family: var(--mc-titulos); font-weight: 800; font-size: 1rem; }
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
  favoritos = inject(FavoritosService);
  producto = signal<Producto | null>(null);
  relacionados = signal<ProductoLista[]>([]);
  cantidad = signal(1);
  fotoFallo = signal(false);
  fallo = signal(false);

  constructor() {
    addIcons({ addOutline, removeOutline, leafOutline, storefrontOutline, checkmarkCircle, chevronForward, heart, heartOutline,
      locationOutline, bicycleOutline, informationCircleOutline, cloudOfflineOutline });
  }

  ngOnInit() {
    this.cargar();
  }

  async cargar() {
    this.fallo.set(false);
    try {
      const p = await this.catalogo.producto(+this.id());
      this.producto.set(p);
      this.cargarRelacionados(p);
    } catch {
      this.fallo.set(true);
    }
  }

  /** Recomendados: productos reales de la misma categoría (sin repetir este) */
  private async cargarRelacionados(p: Producto) {
    try {
      const r = await this.catalogo.productos({ categoria: p.categoriaId, excluir: p.id, pagina: 1 });
      this.relacionados.set(r.items.slice(0, 4));
    } catch {
      this.relacionados.set([]);
    }
  }

  iniciales(nombre?: string) {
    return (nombre ?? '').replace(/^finca\s+/i, '').split(/\s+/).filter(Boolean).slice(0, 2).map((x) => x[0].toUpperCase()).join('') || 'MC';
  }

  agregar(p: Producto) {
    this.carrito.agregar(aLista(p), this.cantidad());
    this.avisos.exito('Agregado al carrito');
  }
}
