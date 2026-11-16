import { Component, computed, input, signal } from '@angular/core';
import { CopPipe } from './format';

export interface VentaDia { fecha: string; total: number; pedidos: number; }

const DIAS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

/**
 * Barras de ventas de los últimos días: una barra por día, hoy resaltado.
 * Al tocar una barra se muestra su valor; también hay una tabla oculta para lectores de pantalla.
 */
@Component({
  selector: 'app-grafico-ventas',
  imports: [CopPipe],
  template: `
    <div class="cabeza">
      <span class="titulo">Ventas entregadas · 7 días</span>
      <strong class="mc-num">{{ total() | cop }}</strong>
      <span class="detalle" aria-live="polite">
        @if (elegido(); as d) { {{ etiqueta(d.fecha, true) }}: <b class="mc-num">{{ d.total | cop }}</b> · {{ d.pedidos }} {{ d.pedidos === 1 ? 'pedido' : 'pedidos' }} }
        @else { {{ pedidos() }} {{ pedidos() === 1 ? 'pedido' : 'pedidos' }} · toca una barra para ver el día }
      </span>
    </div>
    <div class="barras" aria-hidden="true">
      @for (d of dias(); track d.fecha; let ultimo = $last) {
        <button type="button" tabindex="-1" class="col" [class.hoy]="ultimo" [class.activa]="elegido()?.fecha === d.fecha"
          (click)="elegir(d)">
          <span class="pista">
            <span class="barra" [class.cero]="!d.total" [style.height.%]="altura(d.total)"></span>
          </span>
          <span class="dia">{{ ultimo ? 'Hoy' : etiqueta(d.fecha) }}</span>
        </button>
      }
    </div>
    <table class="mc-solo-lector">
      <caption>Ventas entregadas por día</caption>
      <tr><th>Día</th><th>Total</th><th>Pedidos</th></tr>
      @for (d of dias(); track d.fecha) { <tr><td>{{ etiqueta(d.fecha, true) }}</td><td>{{ d.total | cop }}</td><td>{{ d.pedidos }}</td></tr> }
    </table>
  `,
  styles: `
    :host { display: block; padding: 16px; border-radius: var(--mc-radio); background: var(--mc-superficie); box-shadow: var(--mc-e2); }
    .cabeza { display: grid; gap: 2px; margin-bottom: 12px; }
    .titulo { font-size: 0.85rem; color: var(--mc-tinta-suave); font-weight: 600; }
    .cabeza strong { font-size: 1.6rem; line-height: 1.1; }
    .detalle { font-size: 0.85rem; color: var(--mc-tinta-suave); min-height: 1.2em; }
    .detalle b { color: var(--mc-tinta); }
    .barras { display: grid; grid-template-columns: repeat(7, 1fr); gap: 6px; height: 120px;
      border-bottom: 1px solid var(--mc-borde); padding-bottom: 0; }
    .col { display: grid; grid-template-rows: 1fr auto; gap: 6px; min-width: 0; padding: 0; border: 0; background: none;
      font: inherit; color: inherit; cursor: pointer; height: calc(100% + 24px); }
    .pista { display: flex; align-items: flex-end; justify-content: center; height: 100%; }
    .barra { width: 100%; max-width: 30px; min-height: 2px; border-radius: 4px 4px 0 0;
      background: color-mix(in srgb, var(--mc-accion) 45%, var(--mc-superficie)); transition: height 0.4s var(--mc-curva), background-color 0.2s; }
    .barra.cero { background: var(--mc-borde); }
    .hoy .barra:not(.cero), .activa .barra:not(.cero) { background: var(--mc-accion); }
    .dia { font-size: 0.72rem; color: var(--mc-tinta-suave); text-align: center; }
    .hoy .dia, .activa .dia { color: var(--mc-tinta); font-weight: 700; }
    :host { margin-bottom: 16px; }
    .barras { margin-bottom: 24px; }
  `,
})
export class GraficoVentasComponent {
  dias = input.required<VentaDia[]>();
  total = computed(() => this.dias().reduce((s, d) => s + d.total, 0));
  pedidos = computed(() => this.dias().reduce((s, d) => s + d.pedidos, 0));
  private maximo = computed(() => Math.max(...this.dias().map((d) => d.total), 1));
  elegido = signal<VentaDia | null>(null);

  altura(total: number) {
    return total ? Math.max((total / this.maximo()) * 100, 4) : 0;
  }

  elegir(d: VentaDia) {
    this.elegido.set(this.elegido()?.fecha === d.fecha ? null : d);
  }

  etiqueta(fecha: string, larga = false) {
    const d = new Date(`${fecha}T12:00:00`);
    return larga ? `${DIAS[d.getDay()]} ${d.getDate()}` : DIAS[d.getDay()];
  }
}
