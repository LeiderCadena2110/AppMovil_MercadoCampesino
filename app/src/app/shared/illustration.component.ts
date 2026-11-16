import { Component, input } from '@angular/core';

export type Escena = 'canasta' | 'busqueda' | 'pedidos' | 'sin-conexion' | 'cosecha';

/**
 * Ilustraciones de los estados vacíos, con el lenguaje del logo: el contorno del Galeras,
 * los surcos y la planta. SVG en línea (sin descargas) que usa los colores del tema,
 * así se ve bien en modo claro y oscuro.
 */
@Component({
  selector: 'app-ilustracion',
  template: `
    <svg viewBox="0 0 200 140" aria-hidden="true" class="lienzo">
      <!-- Fondo común: cerro, volcán y surcos -->
      <ellipse cx="100" cy="120" rx="92" ry="14" class="suelo" />
      <path d="M22 112 C52 92 70 70 84 58 L94 51 L101 57 L108 51 L118 58 C132 70 150 92 178 112" class="volcan" />
      <path d="M40 124 Q100 114 160 124" class="surco" />

      @switch (escena()) {
        @case ('canasta') {
          <path d="M66 82h68l-7 32a5 5 0 0 1-5 4H78a5 5 0 0 1-5-4z" class="objeto" />
          <path d="M80 82l20-26 20 26" class="trazo" />
          <path d="M88 94v14M100 94v14M112 94v14" class="trazo fino" />
        }
        @case ('busqueda') {
          <circle cx="92" cy="80" r="22" class="objeto" />
          <circle cx="92" cy="80" r="14" class="vidrio" />
          <path d="M108 96l20 20" class="trazo grueso" />
        }
        @case ('pedidos') {
          <path d="M76 52h48v64l-8-5-8 5-8-5-8 5-8-5-8 5z" class="objeto" />
          <path d="M86 68h28M86 78h28M86 88h18" class="trazo fino" />
          <circle cx="122" cy="100" r="13" class="sello" />
          <path d="M116 100l4 4 8-8" class="trazo blanco" />
        }
        @case ('sin-conexion') {
          <path d="M70 92a16 16 0 0 1 4-31 22 22 0 0 1 42-4 18 18 0 0 1 14 35z" class="objeto" />
          <path d="M84 70l32 32" class="trazo grueso" />
        }
        @case ('cosecha') {
          <path d="M100 112V76" class="tallo" />
          <path d="M100 94c-14 0-24-9-26-22 14 0 25 8 26 22z" class="hoja" />
          <path d="M100 84c14-1 23-10 24-23-14 0-23 9-24 23z" class="hoja clara" />
        }
      }
    </svg>
  `,
  styles: `
    :host { display: block; }
    .lienzo { width: 190px; height: auto; display: block; margin: 0 auto; overflow: visible; }
    .suelo { fill: var(--mc-suelo); }
    .volcan { fill: none; stroke: var(--mc-borde); stroke-width: 4; stroke-linecap: round; stroke-linejoin: round; }
    .surco { fill: none; stroke: var(--mc-destaque); stroke-width: 3; stroke-linecap: round; opacity: 0.6; }
    .objeto { fill: var(--mc-superficie); stroke: var(--mc-arcilla); stroke-width: 3.5; stroke-linejoin: round; }
    .vidrio { fill: color-mix(in srgb, var(--mc-accion) 14%, transparent); }
    .trazo { fill: none; stroke: var(--mc-arcilla); stroke-width: 3.5; stroke-linecap: round; stroke-linejoin: round; }
    .trazo.fino { stroke-width: 2.5; opacity: 0.7; }
    .trazo.grueso { stroke-width: 6; }
    .trazo.blanco { stroke: var(--mc-accion-texto); stroke-width: 3; }
    .sello { fill: var(--mc-accion); }
    .tallo { fill: none; stroke: var(--mc-accion); stroke-width: 4; stroke-linecap: round; }
    .hoja { fill: var(--mc-accion); }
    .hoja.clara { fill: color-mix(in srgb, var(--mc-accion) 60%, var(--mc-superficie)); }
  `,
})
export class IlustracionComponent {
  escena = input.required<Escena>();
}
