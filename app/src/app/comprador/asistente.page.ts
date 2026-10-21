import { Component, ElementRef, inject, signal, viewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  IonContent, IonHeader, IonToolbar, IonTitle, IonButtons, IonBackButton, IonFooter, IonIcon, IonSpinner, NavController,
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import { sparkles, arrowUp, add, leafOutline } from 'ionicons/icons';
import { IaService, MensajeIa } from '../core/ia.service';
import { CarritoService } from '../core/carrito.service';
import { AvisosService } from '../core/avisos.service';
import { mensajeError } from '../core/auth.interceptor';
import { ProductoLista } from '../core/models';
import { CopPipe } from '../shared/formato';
import { almacen } from '../core/almacen';

const CLAVE = 'chat_campi';

/** Convierte **negritas** en <strong> escapando todo lo demás (evita inyectar HTML) */
export function textoSeguro(t: string) {
  const escapado = t.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
  return escapado.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br>');
}

@Component({
  selector: 'app-asistente',
  imports: [FormsModule, IonContent, IonHeader, IonToolbar, IonTitle, IonButtons, IonBackButton, IonFooter, IonIcon, IonSpinner, CopPipe],
  template: `
    <ion-header class="ion-no-border"><ion-toolbar>
      <ion-buttons slot="start"><ion-back-button defaultHref="/comprador/tabs/inicio" text="" /></ion-buttons>
      <ion-title>Campi</ion-title>
      <ion-buttons slot="end">
        @if (mensajes().length > 0) { <button type="button" class="limpiar" (click)="limpiar()">Nueva charla</button> }
      </ion-buttons>
    </ion-toolbar></ion-header>

    <ion-content #contenido class="ion-padding">
      @if (mensajes().length === 0) {
        <section class="intro">
          <span class="sello"><ion-icon name="sparkles" /></span>
          <h1>Hola, soy Campi</h1>
          <p>Conozco lo que publicaron hoy los campesinos. Pídeme ideas para el almuerzo, arma tu mercado con un presupuesto o pregunta por un producto.</p>
          <div class="ideas">
            @for (idea of ideas; track idea) {
              <button type="button" (click)="enviar(idea)">{{ idea }}</button>
            }
          </div>
        </section>
      }

      <div class="chat" aria-live="polite">
        @for (m of mensajes(); track $index) {
          <div class="burbuja" [class.mia]="m.rol === 'usuario'">
            <p [innerHTML]="html(m.texto)"></p>
          </div>
          @if (m.productos?.length) {
            <div class="sugeridos">
              @for (p of m.productos; track p.id) {
                <article class="mini" (click)="abrir(p)">
                  <div class="foto">
                    @if (p.miniaturaUrl) { <img [src]="p.miniaturaUrl" [alt]="p.nombre" loading="lazy" /> }
                    @else { <ion-icon name="leaf-outline" /> }
                  </div>
                  <strong>{{ p.nombre }}</strong>
                  <span>{{ p.precio | cop }} / {{ p.unidad }}</span>
                  <button type="button" (click)="$event.stopPropagation(); agregar(p)" [attr.aria-label]="'Agregar ' + p.nombre">
                    <ion-icon name="add" /> Agregar
                  </button>
                </article>
              }
            </div>
          }
        }
        @if (pensando()) {
          <div class="burbuja pensando"><ion-spinner name="dots" /> Campi está revisando el mercado…</div>
        }
      </div>
    </ion-content>

    <ion-footer class="ion-no-border pie">
      <form (ngSubmit)="enviar(texto)">
        <input name="texto" [(ngModel)]="texto" placeholder="Escribe tu pregunta" autocomplete="off" maxlength="500"
          [disabled]="pensando()" aria-label="Pregunta para Campi" />
        <button type="submit" [disabled]="!texto.trim() || pensando()" aria-label="Enviar"><ion-icon name="arrow-up" /></button>
      </form>
      <small>Campi usa inteligencia artificial y puede equivocarse. Revisa precios y cantidades antes de pedir.</small>
    </ion-footer>
  `,
  styles: `
    .limpiar { background: none; border: 0; font: inherit; font-weight: 700; color: var(--ion-color-primary); padding: 8px 12px; }
    .intro { padding: 12px 4px 4px; }
    .sello { width: 56px; height: 56px; border-radius: 18px; display: grid; place-items: center; font-size: 28px;
      background: var(--mc-paramo); color: var(--mc-maiz); }
    .intro h1 { font-size: 1.8rem; margin: 16px 0 8px; }
    .intro p { color: var(--mc-barro); line-height: 1.5; margin: 0 0 20px; max-width: 40ch; }
    .ideas { display: grid; gap: 8px; }
    .ideas button { text-align: left; padding: 14px 16px; border-radius: var(--mc-radio); border: 1px solid var(--mc-borde);
      background: var(--mc-superficie); font: inherit; color: inherit; cursor: pointer; }
    .chat { display: flex; flex-direction: column; gap: 10px; padding-bottom: 8px; }
    .burbuja { max-width: 85%; align-self: flex-start; padding: 12px 14px; border-radius: 18px 18px 18px 6px;
      background: var(--mc-superficie); border: 1px solid var(--mc-borde); line-height: 1.5; }
    .burbuja p { margin: 0; }
    .burbuja.mia { align-self: flex-end; border-radius: 18px 18px 6px 18px; background: var(--mc-paramo); border-color: var(--mc-paramo); color: #fff; }
    .pensando { display: flex; align-items: center; gap: 8px; color: var(--ion-color-medium); }
    .sugeridos { display: flex; gap: 10px; overflow-x: auto; padding: 2px 0 6px; scrollbar-width: none; }
    .mini { flex: 0 0 150px; display: grid; gap: 4px; padding: 8px; border-radius: var(--mc-radio); cursor: pointer;
      border: 1px solid var(--mc-borde); background: var(--mc-superficie); }
    .mini .foto { height: 84px; border-radius: var(--mc-radio-chico); overflow: hidden; display: grid; place-items: center;
      background: color-mix(in srgb, var(--ion-color-primary) 9%, var(--mc-superficie)); color: var(--ion-color-primary); font-size: 28px; }
    .mini img { width: 100%; height: 100%; object-fit: cover; }
    .mini strong { font-size: 0.88rem; line-height: 1.2; }
    .mini span { font-size: 0.8rem; color: var(--ion-color-medium); }
    .mini button { margin-top: 4px; display: flex; align-items: center; justify-content: center; gap: 4px; padding: 8px; border: 0;
      border-radius: var(--mc-radio-chico); background: var(--mc-maiz); color: #1f2a12; font: inherit; font-weight: 700; font-size: 0.85rem; }
    .pie { padding: 8px 12px calc(8px + var(--ion-safe-area-bottom, 0px)); background: var(--ion-background-color); }
    .pie form { display: flex; gap: 8px; }
    .pie input { flex: 1; min-width: 0; height: 50px; padding: 0 16px; border-radius: 25px; border: 1px solid var(--mc-borde);
      background: var(--mc-superficie); color: var(--ion-text-color); font: inherit; }
    .pie button { width: 50px; height: 50px; border-radius: 50%; border: 0; display: grid; place-items: center; font-size: 22px;
      background: var(--mc-paramo); color: #fff; }
    .pie button:disabled { opacity: 0.4; }
    .pie small { display: block; text-align: center; margin-top: 6px; font-size: 0.72rem; color: var(--ion-color-medium); }
  `,
})
export class AsistentePage {
  private ia = inject(IaService);
  private carrito = inject(CarritoService);
  private avisos = inject(AvisosService);
  private nav = inject(NavController);
  private contenido = viewChild.required<IonContent>('contenido');

  ideas = [
    '¿Qué necesito para un locro de papa?',
    'Arma un mercado de verduras con 30 mil pesos',
    '¿Qué café hay y de dónde viene?',
  ];
  mensajes = signal<MensajeIa[]>([]);
  pensando = signal(false);
  texto = '';

  constructor() {
    addIcons({ sparkles, arrowUp, add, leafOutline });
    // La conversación se guarda en el teléfono para retomarla después
    almacen.leer<MensajeIa[]>(CLAVE).then((m) => m && this.mensajes.set(m));
  }

  html = textoSeguro;

  async enviar(pregunta: string) {
    const mensaje = pregunta.trim();
    if (!mensaje || this.pensando()) return;
    const historial = this.mensajes();
    this.mensajes.set([...historial, { rol: 'usuario', texto: mensaje }]);
    this.texto = '';
    this.pensando.set(true);
    this.bajar();
    try {
      const r = await this.ia.asistente(mensaje, historial);
      this.mensajes.update((m) => [...m, { rol: 'ia', texto: r.respuesta, productos: r.productos }]);
      almacen.guardar(CLAVE, this.mensajes().slice(-20));
    } catch (e) {
      this.mensajes.update((m) => [...m, { rol: 'ia', texto: `No pude responder: ${mensajeError(e)}` }]);
    } finally {
      this.pensando.set(false);
      this.bajar();
    }
  }

  limpiar() {
    this.mensajes.set([]);
    almacen.borrar(CLAVE);
  }

  abrir(p: ProductoLista) {
    this.nav.navigateForward(['/comprador/producto', p.id]);
  }

  agregar(p: ProductoLista) {
    this.carrito.agregar(p);
    this.avisos.exito(`${p.nombre} agregado al carrito`);
  }

  private bajar() {
    setTimeout(() => this.contenido().scrollToBottom(300), 50);
  }
}
