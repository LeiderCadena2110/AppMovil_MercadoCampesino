import { Component, input } from '@angular/core';
import { IonIcon } from '@ionic/angular';

/**
 * Estado vacío, sin resultados o con error: ícono, título, explicación y acciones.
 * Las acciones (botones) se pasan como contenido: <app-estado-vacio ...><ion-button>…</ion-button></app-estado-vacio>
 * Recuerda registrar el ícono con addIcons() en la pantalla que lo usa.
 */
@Component({
  selector: 'app-estado-vacio',
  imports: [IonIcon],
  template: `
    <div class="mc-vacio" [class.error]="tipo() === 'error'" role="status">
      <span class="mc-vacio-icono"><ion-icon [name]="icono()" aria-hidden="true" /></span>
      <h3>{{ titulo() }}</h3>
      @if (texto()) { <p>{{ texto() }}</p> }
      <div class="acciones"><ng-content /></div>
    </div>
  `,
  styles: `
    .acciones { display: flex; flex-wrap: wrap; justify-content: center; gap: 8px; margin-top: 8px; }
    .acciones:empty { display: none; }
    .error .mc-vacio-icono { background: color-mix(in srgb, var(--ion-color-danger) 12%, var(--mc-superficie)); color: var(--ion-color-danger); }
  `,
})
export class EstadoVacioComponent {
  icono = input('leaf-outline');
  titulo = input.required<string>();
  texto = input('');
  tipo = input<'vacio' | 'error'>('vacio');
}
