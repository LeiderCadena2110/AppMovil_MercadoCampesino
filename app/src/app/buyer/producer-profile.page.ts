import { Component, OnInit, computed, inject, input, signal } from '@angular/core';
import { IonContent, IonHeader, IonToolbar, IonButtons, IonBackButton, IonIcon, IonButton, IonSpinner } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { checkmarkCircle, locationOutline, leafOutline, cloudOfflineOutline, shieldCheckmarkOutline } from 'ionicons/icons';
import { CatalogoService } from '../core/catalog.service';
import { ProductoLista, Productor } from '../core/models';
import { CatalogoListaComponent } from './catalog-list.component';
import { EstadoVacioComponent } from '../shared/empty-state.component';

/**
 * Perfil del campesino: finca, municipio, quién la trabaja, su descripción y lo que tiene a la venta.
 * La foto del productor necesita una columna nueva en la base de datos; mientras tanto se muestran sus iniciales.
 */
@Component({
  selector: 'app-productor-perfil',
  imports: [IonContent, IonHeader, IonToolbar, IonButtons, IonBackButton, IonIcon, IonButton, IonSpinner, CatalogoListaComponent,
    EstadoVacioComponent],
  template: `
    <ion-header class="ion-no-border"><ion-toolbar>
      <ion-buttons slot="start"><ion-back-button defaultHref="/comprador/tabs/inicio" text="" /></ion-buttons>
    </ion-toolbar></ion-header>
    <ion-content>
      @if (productor(); as p) {
        <section class="portada">
          <span class="avatar" aria-hidden="true">{{ iniciales() }}</span>
          <div>
            <h1>{{ p.nombreFinca }}</h1>
            <p class="lugar"><ion-icon name="location-outline" /> {{ p.municipio?.nombre }}, {{ p.municipio?.departamento }}</p>
            <p class="quien">La trabaja {{ p.usuario?.nombre }}</p>
          </div>
        </section>

        <div class="cuerpo">
          @if (p.verificado) {
            <p class="mc-sello verificada"><ion-icon name="checkmark-circle" /> Finca verificada por Minga App</p>
          }
          @if (p.descripcion) {
            <h2>Sobre la finca</h2>
            <p class="descripcion">{{ p.descripcion }}</p>
          }
          <p class="nota"><ion-icon name="shield-checkmark-outline" /> Para coordinar la entrega, el contacto con el productor se habilita cuando haces un pedido.</p>
          <h2>A la venta ({{ productos().length }})</h2>
        </div>

        @if (productos().length) {
          <app-catalogo-lista [productos]="productos()" />
        } @else {
          <app-estado-vacio icono="leaf-outline" titulo="Sin cosecha disponible por ahora"
            texto="Esta finca no tiene productos publicados en este momento. Vuelve pronto." />
        }
      } @else if (fallo()) {
        <app-estado-vacio tipo="error" icono="cloud-offline-outline" titulo="No pudimos cargar la finca" texto="Revisa tu conexión.">
          <ion-button (click)="cargar()">Reintentar</ion-button>
        </app-estado-vacio>
      } @else {
        <div class="ion-text-center ion-padding"><ion-spinner /></div>
      }
    </ion-content>
  `,
  styles: `
    .portada { display: flex; gap: 16px; align-items: center; margin: 0 16px; padding: 18px; border-radius: var(--mc-radio-grande);
      background: var(--mc-marca); color: var(--mc-marca-texto); }
    .avatar { width: 72px; height: 72px; flex-shrink: 0; border-radius: 50%; display: grid; place-items: center;
      background: var(--mc-destaque); color: var(--mc-destaque-texto); font-family: var(--mc-titulos); font-weight: 800; font-size: 1.6rem; }
    h1 { margin: 0; font-size: 1.5rem; line-height: 1.1; color: var(--mc-marca-texto); }
    .lugar, .quien { margin: 4px 0 0; font-size: 0.92rem; color: var(--mc-marca-suave); display: flex; gap: 4px; align-items: center; }
    .cuerpo { padding: 14px 16px 0; }
    .verificada { margin: 0 0 6px; background: color-mix(in srgb, var(--ion-color-success) 15%, var(--mc-superficie)); color: var(--ion-color-success); }
    h2 { font-size: 1.1rem; margin: 18px 0 6px; }
    .descripcion { margin: 0; line-height: 1.55; max-width: 60ch; }
    .nota { display: flex; gap: 6px; align-items: flex-start; margin: 16px 0 0; padding: 10px 12px; border-radius: var(--mc-radio);
      background: var(--mc-suelo); color: var(--mc-barro); font-size: 0.86rem; }
  `,
})
export class ProductorPerfilPage implements OnInit {
  id = input.required<string>();
  private catalogo = inject(CatalogoService);
  productor = signal<Productor | null>(null);
  fallo = signal(false);

  iniciales = computed(() =>
    (this.productor()?.nombreFinca ?? '').replace(/^finca\s+/i, '').split(/\s+/).filter(Boolean).slice(0, 2)
      .map((x) => x[0].toUpperCase()).join('') || 'MC');

  productos = computed<ProductoLista[]>(() => {
    const p = this.productor();
    return (p?.productos ?? []).filter((x) => x.stock > 0).map((x) => ({
      id: x.id, nombre: x.nombre, precio: x.precio, unidad: x.unidad, stock: x.stock, fotoUrl: x.fotoUrl,
      miniaturaUrl: x.miniaturaUrl ?? null, productorId: p!.id, finca: p!.nombreFinca, productor: p!.usuario?.nombre,
      verificado: p!.verificado, municipio: p!.municipio?.nombre ?? '', categoria: '',
    }));
  });

  constructor() {
    addIcons({ checkmarkCircle, locationOutline, leafOutline, cloudOfflineOutline, shieldCheckmarkOutline });
  }

  ngOnInit() {
    this.cargar();
  }

  async cargar() {
    this.fallo.set(false);
    try { this.productor.set(await this.catalogo.productor(+this.id())); } catch { this.fallo.set(true); }
  }
}
