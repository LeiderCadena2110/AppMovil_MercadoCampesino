import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IonContent, IonButton } from '@ionic/angular';

@Component({
  selector: 'app-bienvenida',
  imports: [IonContent, IonButton, RouterLink],
  template: `
    <ion-content [fullscreen]="true">
      <main class="portada">
        <!-- Montañas de Nariño dibujadas en SVG: livianas y sin descargas -->
        <svg class="montes" viewBox="0 0 400 220" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
          <path d="M0 150 L70 70 L120 120 L190 40 L260 110 L320 60 L400 130 V220 H0 Z" class="lejos" />
          <path d="M0 190 C60 150 110 170 160 150 S270 120 320 150 S380 170 400 160 V220 H0 Z" class="cerca" />
          <g class="surcos">
            <path d="M20 205 C120 185 260 185 380 205" />
            <path d="M40 214 C140 198 260 198 360 214" />
          </g>
        </svg>

        <section class="texto">
          <h1>Mercado<br />Campesino</h1>
          <div class="mc-tejido"></div>
          <p>La cosecha de las veredas de Nariño, directo a tu mesa en Pasto. Sin intermediarios.</p>
        </section>

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
      min-height: 100%; display: grid; grid-template-rows: 1fr auto auto;
      padding: calc(var(--ion-safe-area-top, 0px) + 16px) 22px calc(var(--ion-safe-area-bottom, 0px) + 22px);
      color: #fff; position: relative; overflow: hidden;
    }
    .montes { position: absolute; inset: auto 0 34% 0; width: 100%; height: 42%; }
    .lejos { fill: #2f6b3d; }
    .cerca { fill: #e8b43a; }
    .surcos path { fill: none; stroke: #cc9e33; stroke-width: 3; }
    .texto { position: relative; align-self: start; margin-top: 8vh; }
    h1 { font-size: clamp(2.6rem, 13vw, 3.6rem); line-height: 0.95; margin: 0 0 18px; color: #fff; }
    .mc-tejido { width: 140px; }
    .texto p { font-size: 1.1rem; line-height: 1.45; max-width: 30ch; margin: 18px 0 0; color: #dfe9df; }
    .acciones { position: relative; display: grid; gap: 10px; margin-top: 24px; }
    .acciones ion-button { --background: #e8b43a; --color: #1f2a12; }
    .acciones ion-button[fill='outline'] { --background: transparent; --color: #fff; --border-color: rgba(255,255,255,.6); }
    .nota { text-align: center; font-size: 0.9rem; color: #c9d8cb; margin: 6px 0 0; }
  `,
})
export class BienvenidaPage {}
