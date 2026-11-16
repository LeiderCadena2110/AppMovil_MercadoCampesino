import { Component, inject } from '@angular/core';
import { IonIcon, IonSpinner } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { cloudOfflineOutline, cloudUploadOutline, alertCircleOutline } from 'ionicons/icons';
import { SincronizacionService } from '../core/sync.service';

/** Franja que dice si hay señal y cuántos cambios del productor esperan en el teléfono */
@Component({
  selector: 'app-estado-sincronizacion',
  imports: [IonIcon, IonSpinner],
  template: `
    <div aria-live="polite">
      @if (!sync.enLinea()) {
        <p class="franja sin-senal">
          <ion-icon name="cloud-offline-outline" />
          <span><strong>Sin señal.</strong>
            @if (sync.pendientes()) { {{ sync.pendientes() }} {{ sync.pendientes() === 1 ? 'cambio guardado' : 'cambios guardados' }} en el teléfono: se envían solos al volver la conexión. }
            @else { Lo que publiques o edites se guarda en el teléfono. }
          </span>
        </p>
      } @else if (sync.sincronizando()) {
        <p class="franja"><ion-spinner name="dots" /><span>Enviando tus cambios…</span></p>
      } @else if (sync.conError().length) {
        <p class="franja error">
          <ion-icon name="alert-circle-outline" />
          <span>{{ sync.conError().length === 1 ? '1 cambio no se pudo enviar' : sync.conError().length + ' cambios no se pudieron enviar' }}. Ábrelo en la lista para corregirlo.</span>
        </p>
      } @else if (sync.pendientes()) {
        <p class="franja">
          <ion-icon name="cloud-upload-outline" />
          <span>{{ sync.pendientes() }} {{ sync.pendientes() === 1 ? 'cambio por enviar' : 'cambios por enviar' }}</span>
          <button type="button" class="mc-tocable" (click)="sync.sincronizar()">Enviar ahora</button>
        </p>
      }
    </div>
  `,
  styles: `
    .franja { display: flex; align-items: center; gap: 10px; margin: 8px 16px 0; padding: 10px 12px; border-radius: var(--mc-radio-chico);
      background: var(--mc-suelo); font-size: 0.88rem; }
    .franja ion-icon, .franja ion-spinner { flex-shrink: 0; font-size: 20px; width: 20px; height: 20px; color: var(--mc-barro); }
    .franja span { flex: 1; }
    .franja.error { background: color-mix(in srgb, var(--ion-color-danger) 12%, var(--mc-superficie)); }
    .franja.error ion-icon { color: color-mix(in srgb, var(--ion-color-danger) 60%, var(--mc-tinta)); }
    button { border: 0; background: none; color: var(--mc-accion); font: inherit; font-weight: 700; min-height: 40px; padding: 0 6px; cursor: pointer; }
  `,
})
export class EstadoSincronizacionComponent {
  sync = inject(SincronizacionService);
  constructor() {
    addIcons({ cloudOfflineOutline, cloudUploadOutline, alertCircleOutline });
  }
}
