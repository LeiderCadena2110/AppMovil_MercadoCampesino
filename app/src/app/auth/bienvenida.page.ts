import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IonContent, IonButton } from '@ionic/angular';

@Component({
  selector: 'app-bienvenida',
  imports: [IonContent, IonButton, RouterLink],
  template: `
    <ion-content [fullscreen]="true">
      <main class="portada">

        <section class="texto">
          <h1>Mercado<br />Campesino</h1>
          <div class="mc-tejido"></div>
          <p>La cosecha de las veredas de Nariño, directo a tu mesa en Pasto. Sin intermediarios.</p>
        </section>

        <!-- Montañas de Nariño dibujadas en SVG: livianas y sin descargas -->
        <svg class="montes" viewBox="0 0 400 220" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
          <path d="M0 150 L70 70 L120 120 L190 40 L260 110 L320 60 L400 130 V220 H0 Z" class="lejos" />
          <path d="M0 190 C60 150 110 170 160 150 S270 120 320 150 S380 170 400 160 V220 H0 Z" class="cerca" />
          <g class="surcos">
            <path d="M20 205 C120 185 260 185 380 205" />
            <path d="M40 214 C140 198 260 198 360 214" />
          </g>
        </svg>

        <section class="acciones">
          <ion-button expand="block" size="large" routerLink="/registro">Crear cuenta</ion-button>
          <ion-button expand="block" size="large" fill="outline" routerLink="/login">Ya tengo cuenta</ion-button>
          <p class="nota">¿Cultivas? Regístrate como productor y vende tu cosecha.</p>
        </section>
      </main>
    </ion-content>
  `,
  styles: `
    ion-content { --background: var(--mc-paramo); }
    .portada {
      min-height: 100%; display: grid; grid-template-rows: auto minmax(150px, 1fr) auto;
      padding: calc(var(--ion-safe-area-top, 0px) + 16px) 22px 0;
      color: #fff; overflow: hidden;
    }
    .montes { width: calc(100% + 44px); height: 100%; margin: 24px -22px -1px; align-self: end; display: block; }
    .lejos { fill: #2f6b3d; }
    .cerca { fill: #e8b43a; }
    .surcos path { fill: none; stroke: #cc9e33; stroke-width: 3; }
    .texto { margin-top: 6vh; }
    h1 { font-size: clamp(2.6rem, 13vw, 3.6rem); line-height: 0.95; margin: 0 0 18px; color: #fff; }
    .mc-tejido { width: 140px; }
    .texto p { font-size: 1.1rem; line-height: 1.45; max-width: 30ch; margin: 18px 0 0; color: #dfe9df; }
    .acciones { display: grid; gap: 10px; margin: 0 -22px; padding: 20px 22px 0; background: #e8b43a; }
    .acciones ion-button { --background: var(--mc-paramo); --color: #fff; }
    .acciones ion-button[fill='outline'] { --background: transparent; --color: var(--mc-paramo); --border-color: var(--mc-paramo); }
    .nota { color: #3d2a12; text-align: center; font-size: 0.9rem; margin: 6px 0 0; padding-bottom: calc(var(--ion-safe-area-bottom, 0px) + 22px); }
  `,
})
export class BienvenidaPage {}
