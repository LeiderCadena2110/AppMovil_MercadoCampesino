import { Component, computed, input } from '@angular/core';
import { Escena, IlustracionComponent } from './illustration.component';

/** Ícono de ionicons que se usaba antes → escena ilustrada equivalente */
const ESCENA_DE: Record<string, Escena> = {
  'cart-outline': 'canasta', 'basket-outline': 'canasta', 'search-outline': 'busqueda',
  'receipt-outline': 'pedidos', 'cloud-offline-outline': 'sin-conexion', 'leaf-outline': 'cosecha',
};

/**
 * Estado vacío, sin resultados o con error: ilustración, título, explicación y acciones.
 * Las acciones (botones) se pasan como contenido: <app-estado-vacio ...><ion-button>…</ion-button></app-estado-vacio>
 */
@Component({
  selector: 'app-estado-vacio',
  imports: [IlustracionComponent],
  template: `
    <div class="mc-vacio" [class.error]="tipo() === 'error'" role="status">
      <app-ilustracion [escena]="escenaFinal()" />
      <h3>{{ titulo() }}</h3>
      @if (texto()) { <p>{{ texto() }}</p> }
      <div class="acciones"><ng-content /></div>
    </div>
  `,
  styles: `
    .mc-vacio { padding-top: 20px; }
    .mc-vacio h3 { font-size: 1.2rem; margin-top: 10px; }
    .acciones { display: flex; flex-wrap: wrap; justify-content: center; gap: 8px; margin-top: 10px; }
    .acciones:empty { display: none; }
    .error h3 { color: var(--ion-text-color); }
  `,
})
export class EstadoVacioComponent {
  /** Nombre del ícono (compatibilidad) o la escena directamente */
  icono = input('leaf-outline');
  escena = input<Escena | null>(null);
  titulo = input.required<string>();
  texto = input('');
  tipo = input<'vacio' | 'error'>('vacio');
  escenaFinal = computed<Escena>(() => this.escena() ?? (this.tipo() === 'error' ? 'sin-conexion' : ESCENA_DE[this.icono()] ?? 'cosecha'));
}
