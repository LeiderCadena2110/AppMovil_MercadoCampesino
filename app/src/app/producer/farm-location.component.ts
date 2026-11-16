import { Component, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Capacitor } from '@capacitor/core';
import { Geolocation } from '@capacitor/geolocation';
import { IonButton, IonIcon, IonSpinner } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { locateOutline, trashOutline, shieldCheckmarkOutline } from 'ionicons/icons';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';
import { AuthService } from '../core/auth.service';
import { AvisosService } from '../core/notifications.service';
import { MapaComponent, PuntoMapa } from '../shared/map.component';

/** Límites aproximados de Nariño (la API valida lo mismo) */
const dentroDeNarino = (lat: number, lng: number) => lat >= 0.3 && lat <= 2.7 && lng >= -79.1 && lng <= -76.8;

/**
 * El productor marca dónde queda su finca: con el GPS del teléfono o tocando el mapa.
 * Los compradores solo ven un punto aproximado (a 1 km); el exacto nunca sale de la API.
 */
@Component({
  selector: 'app-ubicacion-finca',
  imports: [IonButton, IonIcon, IonSpinner, MapaComponent],
  template: `
    <section class="tarjeta">
      <h2>Ubicación de mi finca</h2>
      <p class="ayuda">Así los compradores ven en el mapa de dónde viene tu cosecha. Toca el mapa para mover el punto.</p>
      <div class="mapa">
        <app-mapa [puntos]="puntos()" [centro]="centro()" [zoom]="punto() ? 13 : 9" [marcable]="true" (marcado)="mover($event)"
          etiqueta="Mapa para marcar la ubicación de tu finca" />
      </div>
      <p class="estado" aria-live="polite">
        @if (punto(); as p) { {{ guardado() ? 'Ubicación guardada.' : 'Punto sin guardar.' }} ({{ p.lat.toFixed(4) }}, {{ p.lng.toFixed(4) }}) }
        @else { Todavía no has marcado tu finca: los compradores ven solo tu municipio. }
      </p>
      @if (error()) { <p class="error" role="alert">{{ error() }}</p> }
      <div class="botones">
        <ion-button fill="outline" [disabled]="ocupado()" (click)="usarGps()">
          @if (buscando()) { <ion-spinner name="dots" /> } @else { <ion-icon slot="start" name="locate-outline" /> Usar mi ubicación }
        </ion-button>
        @if (punto() && !guardado()) {
          <ion-button [disabled]="ocupado()" (click)="guardar()">Guardar</ion-button>
        } @else if (punto()) {
          <ion-button fill="clear" color="medium" [disabled]="ocupado()" (click)="quitar()"><ion-icon slot="start" name="trash-outline" /> Quitar</ion-button>
        }
      </div>
      <p class="privacidad"><ion-icon name="shield-checkmark-outline" /> Tu punto exacto es privado: el público ve un punto aproximado (a 1 km).</p>
    </section>
  `,
  styles: `
    .tarjeta { margin: 16px 0; padding: 14px 16px; border-radius: var(--mc-radio); background: var(--mc-superficie); box-shadow: var(--mc-e2); }
    h2 { margin: 0 0 4px; font-size: 1.05rem; }
    .ayuda, .estado, .privacidad { margin: 6px 0; font-size: 0.85rem; color: var(--mc-tinta-suave); }
    .mapa { height: 220px; margin-top: 10px; border-radius: var(--mc-radio-chico); overflow: hidden; }
    .mapa app-mapa { height: 100%; }
    .error { margin: 6px 0; color: color-mix(in srgb, var(--ion-color-danger) 60%, var(--mc-tinta)); font-size: 0.88rem; }
    .botones { display: flex; flex-wrap: wrap; gap: 8px; }
    .botones ion-button { margin: 0; }
    .privacidad { display: flex; gap: 6px; align-items: flex-start; }
  `,
})
export class UbicacionFincaComponent {
  private auth = inject(AuthService);
  private http = inject(HttpClient);
  private avisos = inject(AvisosService);
  private inicial = this.auth.usuario()?.productor;
  punto = signal<{ lat: number; lng: number } | null>(this.inicial?.lat != null && this.inicial?.lng != null ? { lat: this.inicial.lat, lng: this.inicial.lng } : null);
  guardado = signal(this.punto() !== null);
  buscando = signal(false);
  guardando = signal(false);
  ocupado = computed(() => this.buscando() || this.guardando());
  error = signal('');
  puntos = computed<PuntoMapa[]>(() => {
    const p = this.punto();
    return p ? [{ id: 'finca', lat: p.lat, lng: p.lng, titulo: 'Tu finca', destacado: true }] : [];
  });
  centro = computed<[number, number] | null>(() => {
    const p = this.punto();
    return p ? [p.lat, p.lng] : null;
  });

  constructor() {
    addIcons({ locateOutline, trashOutline, shieldCheckmarkOutline });
  }

  mover(p: { lat: number; lng: number }) {
    if (!dentroDeNarino(p.lat, p.lng)) {
      this.error.set('Ese punto está fuera de Nariño.');
      return;
    }
    this.error.set('');
    this.punto.set(p);
    this.guardado.set(false);
  }

  async usarGps() {
    this.buscando.set(true);
    this.error.set('');
    try {
      if (Capacitor.isNativePlatform()) {
        const permiso = await Geolocation.requestPermissions({ permissions: ['location'] });
        if (permiso.location !== 'granted') throw new Error('Permite la ubicación en los ajustes del teléfono.');
      }
      const pos = await Geolocation.getCurrentPosition({ enableHighAccuracy: true, timeout: 15_000 });
      const p = { lat: pos.coords.latitude, lng: pos.coords.longitude };
      if (!dentroDeNarino(p.lat, p.lng)) throw new Error('Tu ubicación actual no está en Nariño. Marca la finca tocando el mapa.');
      this.punto.set(p);
      this.guardado.set(false);
    } catch (e) {
      this.error.set(e instanceof Error && e.message.length < 120 ? e.message : 'No pudimos leer tu ubicación. Marca la finca tocando el mapa.');
    } finally {
      this.buscando.set(false);
    }
  }

  async guardar() {
    const p = this.punto();
    if (!p) return;
    this.guardando.set(true);
    try {
      const r = await firstValueFrom(this.http.put<{ lat: number; lng: number }>(`${environment.apiUrl}/mi-finca/ubicacion`, p));
      this.actualizarSesion(r.lat, r.lng);
      this.guardado.set(true);
      this.avisos.exito('Ubicación de la finca guardada');
    } catch (e) {
      this.avisos.error(e);
    } finally {
      this.guardando.set(false);
    }
  }

  async quitar() {
    if (!(await this.avisos.confirmar('Quitar ubicación', 'Los compradores verán solo tu municipio.', 'Quitar'))) return;
    this.guardando.set(true);
    try {
      await firstValueFrom(this.http.delete(`${environment.apiUrl}/mi-finca/ubicacion`));
      this.actualizarSesion(null, null);
      this.punto.set(null);
      this.guardado.set(false);
    } catch (e) {
      this.avisos.error(e);
    } finally {
      this.guardando.set(false);
    }
  }

  private actualizarSesion(lat: number | null, lng: number | null) {
    const u = this.auth.usuario();
    if (u?.productor) this.auth.actualizarUsuario({ ...u, productor: { ...u.productor, lat, lng } });
  }
}
