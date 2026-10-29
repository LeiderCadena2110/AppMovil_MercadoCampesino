import { Component, computed, input } from '@angular/core';
import { DatePipe } from '@angular/common';
import { IonIcon } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { checkmark, closeCircle } from 'ionicons/icons';
import { EstadoPedido, MetodoEntrega } from '../core/models';

/**
 * Línea de tiempo del pedido con los estados reales de la API:
 * PENDIENTE (Recibido) → ACEPTADO (Confirmado, en preparación) → LISTO (para enviar o recoger) → ENTREGADO.
 * RECHAZADO se muestra aparte. No se inventan pasos que el sistema no registra.
 */
@Component({
  selector: 'app-linea-pedido',
  imports: [IonIcon, DatePipe],
  template: `
    @if (estado() === 'RECHAZADO') {
      <div class="rechazado" role="status"><ion-icon name="close-circle" /> El productor no pudo atender este pedido. Los productos no se cobraron.</div>
    } @else {
      <ol class="linea" aria-label="Estado del pedido">
        @for (paso of pasos(); track paso.titulo; let i = $index) {
          <li [class.hecho]="i < actual()" [class.actual]="i === actual()" [attr.aria-current]="i === actual() ? 'step' : null">
            <span class="punto">@if (i < actual() || (i === actual() && estado() === 'ENTREGADO')) { <ion-icon name="checkmark" /> }</span>
            <div>
              <strong>{{ paso.titulo }}</strong>
              <small>{{ i === 0 ? (creado() | date: 'd MMM, h:mm a') : paso.detalle }}</small>
            </div>
          </li>
        }
      </ol>
    }
  `,
  styles: `
    .linea { list-style: none; margin: 0; padding: 0; }
    li { position: relative; display: flex; gap: 12px; padding-bottom: 18px; color: var(--mc-tinta-suave); }
    li:last-child { padding-bottom: 0; }
    li:not(:last-child)::before { content: ''; position: absolute; left: 13px; top: 28px; bottom: 0; width: 2px; background: var(--mc-borde); }
    li.hecho:not(:last-child)::before { background: var(--mc-accion); }
    .punto { width: 28px; height: 28px; flex-shrink: 0; border-radius: 50%; display: grid; place-items: center;
      border: 2px solid var(--mc-borde); background: var(--mc-superficie); color: var(--mc-accion-texto); font-size: 16px; }
    li.hecho .punto { background: var(--mc-accion); border-color: var(--mc-accion); }
    li.actual .punto { border-color: var(--mc-accion); box-shadow: 0 0 0 4px color-mix(in srgb, var(--mc-accion) 20%, transparent); }
    li.actual { color: var(--ion-text-color); }
    li.hecho strong, li.actual strong { color: var(--ion-text-color); }
    strong { display: block; font-size: 0.98rem; }
    small { font-size: 0.82rem; }
    .rechazado { display: flex; gap: 8px; align-items: center; padding: 12px 14px; border-radius: var(--mc-radio);
      background: color-mix(in srgb, var(--ion-color-danger) 12%, var(--mc-superficie)); color: var(--ion-color-danger); font-weight: 700; }
  `,
})
export class LineaPedidoComponent {
  estado = input.required<EstadoPedido>();
  metodo = input<MetodoEntrega>('CONTRA_ENTREGA');
  creado = input<string>('');

  pasos = computed(() => [
    { titulo: 'Recibido', detalle: '' },
    { titulo: 'Confirmado', detalle: 'En preparación' },
    { titulo: this.metodo() === 'RECOGIDA' ? 'Listo para recoger' : 'Listo para enviar', detalle:
      this.metodo() === 'RECOGIDA' ? 'Se puede recoger en la finca' : 'Listo para salir a la dirección acordada' },
    { titulo: 'Entregado', detalle: 'Pedido completado' },
  ]);

  actual = computed(() => ({ PENDIENTE: 0, ACEPTADO: 1, LISTO: 2, ENTREGADO: 3, RECHAZADO: -1 })[this.estado()]);

  constructor() {
    addIcons({ checkmark, closeCircle });
  }
}
