import { Component, computed, inject, signal } from '@angular/core';
import {
  IonContent, IonHeader, IonToolbar, IonTitle, IonButtons, IonBackButton, IonIcon, IonSpinner, IonButton, NavController,
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import { checkmarkCircle, locationOutline, chevronForward, cloudOfflineOutline } from 'ionicons/icons';
import { CatalogoService } from '../core/catalog.service';
import { FincaMapa } from '../core/models';
import { MapaComponent, PuntoMapa } from '../shared/map.component';
import { EstadoVacioComponent } from '../shared/empty-state.component';

/**
 * Fincas de Nariño en el mapa. Abajo, las mismas fincas como tarjetas deslizables
 * (accesibles sin el mapa): tocar una tarjeta resalta su marcador y tocar un marcador, su tarjeta.
 */
@Component({
  selector: 'app-mapa-fincas',
  imports: [IonContent, IonHeader, IonToolbar, IonTitle, IonButtons, IonBackButton, IonIcon, IonSpinner, IonButton, MapaComponent, EstadoVacioComponent],
  template: `
    <ion-header class="ion-no-border"><ion-toolbar>
      <ion-buttons slot="start"><ion-back-button defaultHref="/comprador/tabs/inicio" text="" /></ion-buttons>
      <ion-title>Fincas en el mapa</ion-title>
    </ion-toolbar></ion-header>
    <ion-content [scrollY]="false">
      @if (fincas().length) {
        <app-mapa class="mapa" [puntos]="puntos()" [activo]="elegida()" (elegido)="elegir($any($event))" />
        <section class="panel-fincas" aria-label="Fincas">
          <p class="resumen">{{ fincas().length }} {{ fincas().length === 1 ? 'finca' : 'fincas' }} con cosecha a la venta · ubicación aproximada</p>
          <div class="tarjetas" #carril>
            @for (f of fincas(); track f.id) {
              <article class="finca" [class.activa]="f.id === elegida()" [id]="'finca-' + f.id">
                <button type="button" class="ver mc-tocable" (click)="elegir(f.id)" [attr.aria-pressed]="f.id === elegida()">
                  <strong>{{ f.nombreFinca }} @if (f.verificado) { <ion-icon name="checkmark-circle" class="verificada" aria-label="verificada" /> }</strong>
                  <small><ion-icon name="location-outline" /> {{ f.municipio }}{{ f.precision === 'municipio' ? ' (zona)' : '' }}</small>
                  <span class="cats">{{ f.categorias.slice(0, 3).join(' · ') }}</span>
                </button>
                <button type="button" class="abrir mc-tocable" (click)="abrir(f.id)">
                  {{ f.productos }} {{ f.productos === 1 ? 'producto' : 'productos' }} <ion-icon name="chevron-forward" />
                </button>
              </article>
            }
          </div>
        </section>
      } @else if (cargando()) {
        <div class="ion-text-center ion-padding"><ion-spinner /></div>
      } @else {
        <app-estado-vacio escena="cosecha" titulo="Aún no hay fincas en el mapa"
          texto="Cuando los productores publiquen su cosecha, sus fincas aparecerán aquí." >
          @if (fallo()) { <ion-button (click)="cargar()">Reintentar</ion-button> }
        </app-estado-vacio>
      }
    </ion-content>
  `,
  styles: `
    ion-content { --overflow: hidden; }
    .mapa { position: absolute; inset: 0 0 172px 0; }
    .panel-fincas { position: absolute; left: 0; right: 0; bottom: 0; height: 184px; padding: 10px 0 calc(8px + var(--ion-safe-area-bottom, 0px));
      background: var(--mc-superficie); border-radius: 22px 22px 0 0; box-shadow: var(--mc-e3); z-index: 500; }
    .resumen { margin: 0 16px 8px; font-size: 0.85rem; color: var(--mc-tinta-suave); }
    .tarjetas { display: flex; gap: 10px; overflow-x: auto; padding: 2px 16px 8px; scroll-snap-type: x mandatory; scrollbar-width: none; }
    .finca { flex: 0 0 78%; max-width: 300px; scroll-snap-align: start; display: grid; border-radius: var(--mc-radio); background: var(--mc-fondo, var(--ion-background-color));
      box-shadow: 0 0 0 1px var(--mc-borde); overflow: hidden; }
    .finca.activa { box-shadow: 0 0 0 2px var(--mc-accion); }
    .ver { display: grid; gap: 3px; padding: 12px 14px 8px; border: 0; background: none; text-align: left; font: inherit; color: inherit; cursor: pointer; }
    .ver strong { display: flex; align-items: center; gap: 4px; font-size: 1rem; }
    .ver small { display: flex; align-items: center; gap: 3px; color: var(--mc-tinta-suave); }
    .cats { font-size: 0.82rem; color: var(--mc-barro); font-weight: 600; }
    .verificada { color: var(--ion-color-success); }
    .abrir { display: flex; align-items: center; justify-content: space-between; min-height: 44px; padding: 0 14px; border: 0; border-top: 1px solid var(--mc-borde);
      background: none; color: var(--mc-accion); font: inherit; font-weight: 700; cursor: pointer; }
  `,
})
export class MapaFincasPage {
  private catalogo = inject(CatalogoService);
  private nav = inject(NavController);
  fincas = signal<FincaMapa[]>([]);
  cargando = signal(true);
  fallo = signal(false);
  elegida = signal<number | null>(null);
  puntos = computed<PuntoMapa[]>(() => this.fincas().map((f) => ({
    id: f.id, lat: f.lat, lng: f.lng, titulo: `${f.nombreFinca}, ${f.municipio}`, destacado: f.verificado,
  })));

  constructor() {
    addIcons({ checkmarkCircle, locationOutline, chevronForward, cloudOfflineOutline });
    this.cargar();
  }

  async cargar() {
    this.cargando.set(true);
    this.fallo.set(false);
    try {
      this.fincas.set(await this.catalogo.fincasMapa());
    } catch {
      this.fallo.set(true);
    } finally {
      this.cargando.set(false);
    }
  }

  elegir(id: number) {
    this.elegida.set(id);
    document.getElementById(`finca-${id}`)?.scrollIntoView({ behavior: 'smooth', inline: 'start', block: 'nearest' });
  }

  abrir(id: number) {
    this.nav.navigateForward(['/comprador/productor', id]);
  }
}
