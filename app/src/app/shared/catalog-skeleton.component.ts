import { Component, input } from '@angular/core';

/** Tarjetas "fantasma" mientras carga el catálogo: evitan la pantalla en blanco */
@Component({
  selector: 'app-catalogo-cargando',
  template: `
    <div class="rejilla" aria-label="Cargando productos" role="status">
      @for (i of cajas(); track i) {
        <div class="tarjeta">
          <div class="foto brillo"></div>
          <div class="linea brillo larga"></div>
          <div class="linea brillo"></div>
          <div class="linea brillo corta"></div>
        </div>
      }
    </div>
  `,
  styles: `
    .rejilla { display: grid; grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); gap: 12px; padding: 6px 12px; }
    .tarjeta { border: 1px solid var(--mc-borde); border-radius: var(--mc-radio); background: var(--mc-superficie); overflow: hidden; padding-bottom: 12px; }
    .foto { aspect-ratio: 4 / 3; }
    .linea { height: 12px; margin: 10px 12px 0; border-radius: 6px; width: 55%; }
    .linea.larga { width: 80%; } .linea.corta { width: 35%; }
    .brillo { background: linear-gradient(90deg, var(--mc-borde) 0%, var(--mc-nube) 50%, var(--mc-borde) 100%);
      background-size: 200% 100%; animation: brillo 1.2s linear infinite; }
    @keyframes brillo { from { background-position: 200% 0; } to { background-position: -200% 0; } }
  `,
})
export class CatalogoCargandoComponent {
  cantidad = input(4);
  cajas() { return Array.from({ length: this.cantidad() }, (_, i) => i); }
}
