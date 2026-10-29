import { Component, OnDestroy, OnInit, output, signal } from '@angular/core';
import { ESLOGAN, LOGO } from './brand';

/**
 * Animación de entrada (~2,5 s) que construye el símbolo de Minga App paso a paso:
 *  1. aparece el paisaje de fondo (cordillera y Galeras en tonos de páramo)
 *  2. se dibuja el contorno del volcán y la línea de la tierra (trazos SVG)
 *  3. nace la planta: crece el tallo y se abren las hojas
 *  4. aparece el recuadro del ícono y el volcán se rellena: queda el logotipo
 *  5. aparecen "Minga App" y el eslogan
 * Solo usa CSS (stroke-dashoffset, opacidad y transform): sin imágenes ni librerías.
 * Se dibuja encima de la app, que carga por debajo, así no bloquea la navegación.
 * Tocar la pantalla la salta. Con "reducir movimiento" se muestra el logo ya formado.
 */
@Component({
  selector: 'app-splash',
  template: `
    <div class="splash" [class.saliendo]="saliendo()" (click)="terminar()" role="img"
      [attr.aria-label]="'Minga App. ' + eslogan">
      <!-- 1. Paisaje de fondo -->
      <svg class="paisaje" viewBox="0 0 400 300" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
        <path class="lejana" d="M0 210 L60 170 L110 190 L170 140 L215 120 L230 128 L245 120 L290 150 L340 135 L400 175 V300 H0 Z" />
        <path class="cercana" d="M0 245 C70 220 130 236 200 226 S330 214 400 236 V300 H0 Z" />
        <path class="surcos" d="M20 268 C140 252 260 252 380 268 M50 285 C150 272 250 272 350 285" />
      </svg>

      <div class="centro">
        <svg class="logo" viewBox="0 0 200 200" aria-hidden="true">
          <!-- 4. Recuadro del ícono (aparece al final) -->
          <rect class="placa" x="4" y="4" width="192" height="192" rx="44" />
          <!-- 4. Relleno del volcán -->
          <path class="volcan-relleno" [attr.d]="logo.volcan + ' Z'" />
          <!-- 2. Contorno del volcán y la tierra -->
          <path class="trazo volcan" [attr.d]="logo.volcan" pathLength="1" />
          <path class="trazo tierra" [attr.d]="logo.tierra" pathLength="1" />
          <path class="trazo surco s1" [attr.d]="logo.surco1" pathLength="1" />
          <path class="trazo surco s2" [attr.d]="logo.surco2" pathLength="1" />
          <!-- 3. La planta -->
          <path class="trazo tallo" [attr.d]="logo.tallo" pathLength="1" />
          <path class="hoja izquierda" [attr.d]="logo.hojaIzquierda" />
          <path class="hoja derecha" [attr.d]="logo.hojaDerecha" />
        </svg>
        <!-- 5. Nombre y eslogan -->
        <h1>Minga App</h1>
        <p>{{ eslogan }}</p>
      </div>
    </div>
  `,
  styles: `
    :host { position: fixed; inset: 0; z-index: 99999; }
    .splash {
      position: absolute; inset: 0; overflow: hidden; display: grid; place-items: center;
      background: radial-gradient(120% 80% at 50% 30%, #2a5e37 0%, #1f4d2b 45%, #163a20 100%);
      color: #fff; transition: opacity 320ms ease;
      animation: aparecer 300ms ease both;
    }
    .splash.saliendo { opacity: 0; pointer-events: none; }

    /* Paisaje */
    .paisaje { position: absolute; inset: auto 0 0 0; width: 100%; height: 55%; }
    .lejana { fill: #2f6b3d; opacity: 0.55; animation: aparecer 500ms 100ms ease both; }
    .cercana { fill: #e0a83a; opacity: 0.22; animation: aparecer 500ms 200ms ease both; }
    .surcos { fill: none; stroke: #e0a83a; stroke-width: 3; opacity: 0.25; animation: aparecer 500ms 300ms ease both; }

    .centro { position: relative; display: grid; justify-items: center; text-align: center; padding: 0 24px; margin-top: -8vh; }
    .logo { width: min(52vw, 220px); height: auto; overflow: visible; }

    /* Trazos: el estado normal es el final; la animación parte de "sin dibujar" */
    .trazo { fill: none; stroke-linecap: round; stroke-linejoin: round; stroke-dasharray: 1; stroke-dashoffset: 0; }
    .volcan { stroke: #ffffff; stroke-width: 6; animation: dibujar 800ms 200ms cubic-bezier(.6,0,.3,1) both; }
    .tierra { stroke: #e0a83a; stroke-width: 6; animation: dibujar 450ms 600ms ease-out both; }
    .surco { stroke: #e0a83a; stroke-width: 4; opacity: 0.8; }
    .s1 { animation: dibujar 400ms 750ms ease-out both; }
    .s2 { animation: dibujar 400ms 850ms ease-out both; }
    .tallo { stroke: #7fcf8a; stroke-width: 6; animation: dibujar 450ms 900ms ease-out both; }

    /* Hojas: se abren desde el tallo */
    .hoja { fill: #7fcf8a; transform-box: fill-box; }
    .izquierda { transform-origin: 100% 100%; animation: brotar 380ms 1150ms cubic-bezier(.3,1.4,.5,1) both; }
    .derecha { transform-origin: 0% 100%; fill: #a6dfae; animation: brotar 380ms 1280ms cubic-bezier(.3,1.4,.5,1) both; }

    /* Se forma el ícono: placa y relleno del volcán */
    .placa { fill: #ffffff; opacity: 0.08; transform-box: fill-box; transform-origin: center;
      animation: placa 450ms 1450ms ease-out both; }
    .volcan-relleno { fill: #2f6b3d; opacity: 0.7; animation: aparecer 450ms 1450ms ease both; }

    h1 { margin: 18px 0 6px; font-family: var(--mc-titulos); font-weight: 800; font-size: clamp(2rem, 9vw, 2.6rem);
      line-height: 1; color: #fff; animation: subir 420ms 1500ms ease-out both; }
    p { margin: 0; font-size: 1rem; color: #dfe9df; max-width: 28ch; animation: subir 420ms 1640ms ease-out both; }

    @keyframes aparecer { from { opacity: 0; } }
    @keyframes dibujar { from { stroke-dashoffset: 1; } }
    @keyframes brotar { from { transform: scale(0); opacity: 0; } }
    @keyframes placa { from { transform: scale(0.85); opacity: 0; } }
    @keyframes subir { from { opacity: 0; transform: translateY(10px); } }

    @media (prefers-reduced-motion: reduce) {
      .splash, .splash * { animation: none !important; }
    }
  `,
})
export class SplashComponent implements OnInit, OnDestroy {
  /** Avisa cuando la animación terminó (o el usuario la saltó) */
  listo = output<void>();
  readonly logo = LOGO;
  readonly eslogan = ESLOGAN;
  saliendo = signal(false);
  private temporizadores: ReturnType<typeof setTimeout>[] = [];

  ngOnInit() {
    const reducido = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
    // La secuencia se arma en ~2 s y deja leer el eslogan medio segundo; con movimiento reducido solo se muestra el logo un momento
    this.temporizadores.push(setTimeout(() => this.terminar(), reducido ? 900 : 2700));
  }

  terminar() {
    if (this.saliendo()) return;
    this.saliendo.set(true);
    this.temporizadores.push(setTimeout(() => this.listo.emit(), 320));
  }

  ngOnDestroy() {
    this.temporizadores.forEach(clearTimeout);
  }
}
