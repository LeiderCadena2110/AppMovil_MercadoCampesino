import { Component, computed, input } from '@angular/core';

/**
 * Íconos propios de las categorías, dibujados con el mismo trazo redondeado del logo.
 * Se eligen por el nombre de la categoría (sin tildes); si no hay uno, se usa la hoja.
 * Cuadrícula de 24 × 24, trazo de 1,8 y color del texto (currentColor).
 */
const ICONOS: Record<string, string[]> = {
  todo: ['M3.5 10h17l-2 9.5a1.5 1.5 0 0 1-1.5 1.2H7a1.5 1.5 0 0 1-1.5-1.2z', 'M8 10l4-6 4 6', 'M9.5 14v3M14.5 14v3'],
  frutas: ['M12 7.5c-4.5-2.5-8.5 1-7.3 6 1 4.4 4 7.3 7.3 6.4 3.3.9 6.3-2 7.3-6.4 1.2-5-2.8-8.5-7.3-6z', 'M12 7.5c0-2 .8-3.3 2.6-4.3', 'M12 6c-1.6-1.6-3.6-1.8-5-1.2 .8 1.7 2.8 2.4 5 1.2z'],
  verduras: ['M6 19.5l8.2-10.2 2.6 2.6-10.2 8.2z', 'M14.6 8.8l3.2-4.3', 'M16 10.4l4.3-2.6', 'M14 8l.7-4.5', 'M9.5 15.5l1.4 1.4M11.6 13l1.2 1.2'],
  tuberculos: ['M6.5 8.6c3-3.3 9.8-3.1 11.6 1.2 1.8 4.2-.3 9.2-5.4 9.8-5.2.6-9.2-1.4-9.2-5.1 0-2.4 1.2-4.1 3-5.9z', 'M9.5 11h.01M14.5 10h.01M12.5 15h.01M8.5 15.5h.01'],
  granos: ['M12 3c3 0 4.2 4 4.2 8.2S15 20 12 20s-4.2-4.6-4.2-8.8S9 3 12 3z', 'M8.3 8.5h7.4M8 12.5h8M8.6 16.5h6.8M12 3.5v16', 'M8 14c-3 1.2-4 4.8-3.2 7M16 14c3 1.2 4 4.8 3.2 7'],
  lacteos: ['M3 17.5v-5L15 6.5l6 4v7z', 'M3 12.5h18', 'M8 15.2h.01M13 15.5h.01M16.5 14.8h.01'],
  cafe: ['M4 9h12v4.5A5.5 5.5 0 0 1 10.5 19h-1A5.5 5.5 0 0 1 4 13.5z', 'M16 10.5h1.5a2.2 2.2 0 0 1 0 4.4H16', 'M8 3.5c-1 1 1 2 0 3M12 3.5c-1 1 1 2 0 3', 'M3 21h14'],
  hierbas: ['M12 21V8', 'M12 13.5c-3.2 0-5.2-2-5.2-5.2 3.2 0 5.2 2 5.2 5.2z', 'M12 10.5c3.2 0 5.2-2 5.2-5.2-3.2 0-5.2 2-5.2 5.2z', 'M12 17.5c3 0 5-1.8 5-4.2-3 0-5 1.8-5 4.2z'],
  hoja: ['M5 19c0-8 5-13 14-14-1 9-6 14-14 14z', 'M5 19l8-8'],
};

export function claveCategoria(nombre: string | null | undefined): string {
  const n = (nombre ?? 'todo').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
  return n in ICONOS ? n : 'hoja';
}

@Component({
  selector: 'app-icono-categoria',
  template: `
    <svg viewBox="0 0 24 24" [attr.width]="tamano()" [attr.height]="tamano()" aria-hidden="true"
      fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
      @for (d of trazos(); track $index) { <path [attr.d]="d" /> }
    </svg>
  `,
  styles: `:host { display: inline-grid; place-items: center; line-height: 0; }`,
})
export class IconoCategoriaComponent {
  /** Nombre de la categoría tal como viene de la API ("Tubérculos"), o "todo" */
  nombre = input<string | null>('todo');
  tamano = input(26);
  trazos = computed(() => ICONOS[claveCategoria(this.nombre())]);
}
