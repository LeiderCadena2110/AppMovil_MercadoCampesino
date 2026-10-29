import { Component, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IonContent, IonButton } from '@ionic/angular';
import { ESLOGAN, LOGO } from '../shared/brand';

@Component({
  selector: 'app-bienvenida',
  imports: [IonContent, IonButton, RouterLink],
  template: `
    <ion-content [fullscreen]="true">
      <main class="portada">
        <!-- Foto del volcán y los cultivos (optimizada: 40-100 KB según la pantalla).
             Si no carga, queda la ilustración del paisaje como respaldo. -->
        <div class="foto" [class.sin-foto]="fotoFallo()">
          @if (!fotoFallo()) {
            <img
              src="img/galeras-campo-720.webp"
              srcset="img/galeras-campo-720.webp 720w, img/galeras-campo.webp 1280w"
              sizes="100vw" fetchpriority="high" decoding="async"
              alt="Volcán al amanecer sobre laderas verdes; en primer plano, campesinos trabajando la tierra entre cultivos"
              (error)="fotoFallo.set(true)" />
          } @else {
            <svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
              <path d="M0 210 L60 170 L110 190 L170 140 L215 120 L230 128 L245 120 L290 150 L340 135 L400 175 V300 H0 Z" fill="#2f6b3d" />
              <path d="M0 245 C70 220 130 236 200 226 S330 214 400 236 V300 H0 Z" fill="#e0a83a" opacity=".35" />
            </svg>
          }
        </div>

        <section class="texto">
          <svg class="marca" viewBox="0 0 200 200" aria-hidden="true">
            <path [attr.d]="logo.volcan" fill="none" stroke="#fff" stroke-width="9" stroke-linecap="round" stroke-linejoin="round" />
            <path [attr.d]="logo.tierra" stroke="#e0a83a" stroke-width="9" stroke-linecap="round" />
            <path [attr.d]="logo.tallo" fill="none" stroke="#7fcf8a" stroke-width="9" stroke-linecap="round" />
            <path [attr.d]="logo.hojaIzquierda" fill="#7fcf8a" />
            <path [attr.d]="logo.hojaDerecha" fill="#a6dfae" />
          </svg>
          <h1>Minga App</h1>
          <p class="eslogan">{{ eslogan }}</p>
          <p class="detalle">Como en la minga, trabajamos juntos: la cosecha de las veredas de Nariño llega directo a tu mesa en Pasto.</p>
        </section>

        <section class="acciones">
          <ion-button expand="block" size="large" class="principal" routerLink="/registro">Crear cuenta</ion-button>
          <ion-button expand="block" size="large" fill="outline" class="secundario" routerLink="/login">Ya tengo cuenta</ion-button>
          <p class="nota">¿Cultivas? Crea tu cuenta como productor y vende tu cosecha.</p>
        </section>
      </main>
    </ion-content>
  `,
  styles: `
    ion-content { --background: var(--mc-marca); }
    .portada {
      position: relative; min-height: 100%; display: flex; flex-direction: column; justify-content: flex-end;
      color: #fff; overflow: hidden; background: var(--mc-marca);
    }

    /* La foto ocupa la parte de arriba; se recorta para que el volcán y los campesinos
       queden visibles y el texto vaya sobre la zona de cultivos (abajo), no encima de ellos */
    .foto { position: absolute; inset: 0 0 auto 0; height: 57%; }
    .foto img { width: 100%; height: 100%; object-fit: cover; object-position: 86% 50%; display: block; }
    .foto svg { width: 100%; height: 100%; }
    .foto.sin-foto { background: radial-gradient(120% 80% at 50% 30%, #2a5e37, #1f4d2b); }
    /* Capa verde: transparente arriba y sólida donde va el texto, para que siempre se lea */
    .foto::after {
      content: ''; position: absolute; inset: 0;
      background: linear-gradient(180deg, rgba(22, 58, 32, 0.3) 0%, rgba(22, 58, 32, 0) 20%,
        rgba(22, 58, 32, 0) 72%, rgba(31, 77, 43, 0.75) 90%, var(--mc-marca) 100%);
    }

    .texto, .acciones { position: relative; padding: 0 22px; }
    .texto { margin-top: 46vh; }
    .marca { width: 54px; height: 54px; display: block; margin-bottom: 8px; filter: drop-shadow(0 1px 2px rgba(0,0,0,.35)); }
    h1 { margin: 0; font-size: clamp(2.4rem, 11vw, 3.2rem); line-height: 1; color: #fff; text-shadow: 0 2px 10px rgba(0,0,0,.35); }
    .eslogan { margin: 8px 0 0; font-family: var(--mc-titulos); font-weight: 600; font-size: 1.15rem; color: var(--mc-maiz); }
    .detalle { margin: 8px 0 0; font-size: 1rem; line-height: 1.45; color: #dfe9df; max-width: 36ch; }

    .acciones { display: grid; gap: 12px; padding-top: 22px; padding-bottom: calc(var(--ion-safe-area-bottom, 0px) + 20px); }
    ion-button { margin: 0; min-height: 56px; --border-radius: 16px; font-size: 1.08rem; }
    .principal { --background: #2b7f3a; --background-activated: #226a2f; --color: #fff; --box-shadow: 0 6px 16px rgba(0,0,0,.25); }
    .secundario { --color: #fff; --border-color: rgba(255,255,255,.75); --border-width: 2px;
      --background: rgba(255,255,255,.06); --background-activated: rgba(255,255,255,.18); }
    .nota { margin: 2px 0 0; text-align: center; font-size: 0.9rem; color: #cfe0d2; }

    /* Pantallas bajas (o celular girado): la foto se achica para que los botones quepan */
    @media (max-height: 760px) {
      .detalle { display: none; }
    }
    @media (max-height: 640px) {
      .foto { height: 50%; }
      .texto { margin-top: 38vh; }
      .marca { width: 40px; height: 40px; }
    }
    /* Pantallas anchas (tablet o web): texto y botones con ancho cómodo */
    @media (min-width: 700px) {
      .foto { height: 70%; }
      .foto img { object-position: 70% 45%; }
      .texto { margin-top: 58vh; }
      .texto, .acciones { width: 100%; max-width: 520px; margin-left: auto; margin-right: auto; }
    }
  `,
})
export class BienvenidaPage {
  readonly logo = LOGO;
  readonly eslogan = ESLOGAN;
  fotoFallo = signal(false);
}
