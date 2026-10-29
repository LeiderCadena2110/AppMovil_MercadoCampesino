import { Component, OnInit, computed, inject, input, signal } from '@angular/core';
import {
  IonContent, IonHeader, IonToolbar, IonTitle, IonButtons, IonBackButton, IonButton, IonFooter, IonIcon, IonSpinner, IonTextarea,
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import { star, starOutline, callOutline, logoWhatsapp, shieldCheckmarkOutline, cloudOfflineOutline } from 'ionicons/icons';
import { LineaPedidoComponent } from './order-timeline.component';
import { EstadoVacioComponent } from './empty-state.component';
import { enlaceLlamada, enlaceWhatsApp } from './contact';
import { AuthService } from '../core/auth.service';
import { PedidosService } from '../core/orders.service';
import { AvisosService } from '../core/notifications.service';
import { EstadoPedido, Pedido } from '../core/models';
import { CopPipe, ESTADOS, UnidadPipe } from './format';

const SIGUIENTE: Partial<Record<EstadoPedido, { estado: EstadoPedido; texto: string }>> = {
  ACEPTADO: { estado: 'LISTO', texto: 'Marcar como listo para entregar' },
  LISTO: { estado: 'ENTREGADO', texto: 'Marcar como entregado' },
};

/** Detalle del pedido. El productor cambia el estado; el comprador califica cuando se entrega. */
@Component({
  selector: 'app-pedido-detalle',
  imports: [IonContent, IonHeader, IonToolbar, IonTitle, IonButtons, IonBackButton, IonButton, IonFooter, IonIcon, IonSpinner,
    IonTextarea, CopPipe, UnidadPipe, LineaPedidoComponent, EstadoVacioComponent],
  template: `
    <ion-header class="ion-no-border"><ion-toolbar>
      <ion-buttons slot="start"><ion-back-button [defaultHref]="esProductor ? '/productor/tabs/pedidos' : '/comprador/tabs/pedidos'" text="" /></ion-buttons>
      <ion-title>Pedido #{{ id() }}</ion-title>
    </ion-toolbar></ion-header>
    <ion-content class="ion-padding">
      @if (pedido(); as p) {
        <section class="bloque">
          <app-linea-pedido [estado]="p.estado" [metodo]="p.metodoEntrega" [creado]="p.creadoEn" />
        </section>

        <!-- Contacto: solo entre las dos partes del pedido -->
        <section class="bloque tarjeta">
          <h2>{{ esProductor ? 'Comprador' : 'Productor' }}</h2>
          <p class="persona">
            <strong>{{ esProductor ? p.comprador.nombre : p.productor.nombreFinca }}</strong>
            @if (!esProductor) { <span>{{ p.productor.usuario.nombre }}</span> }
          </p>
          @if (whatsapp() || llamada()) {
            <div class="contacto">
              @if (whatsapp(); as w) {
                <ion-button fill="outline" [href]="w" target="_blank" rel="noopener"><ion-icon slot="start" name="logo-whatsapp" /> WhatsApp</ion-button>
              }
              @if (llamada(); as l) {
                <ion-button fill="outline" [href]="l"><ion-icon slot="start" name="call-outline" /> Llamar</ion-button>
              }
            </div>
            <p class="nota"><ion-icon name="shield-checkmark-outline" /> El número solo se comparte dentro de este pedido. Acuerden por aquí la hora de entrega y el costo del envío.</p>
          } @else {
            <p class="nota">Esta persona no registró un número de contacto.</p>
          }
        </section>

        <section class="bloque tarjeta">
          <h2>Entrega</h2>
          <p class="fila"><span>Forma</span><strong>{{ p.metodoEntrega === 'RECOGIDA' ? 'Se recoge en la finca' : 'Contra entrega (se paga al recibir)' }}</strong></p>
          <p class="fila"><span>Dirección</span><strong>{{ p.direccion }}</strong></p>
          <p class="fila"><span>Costo de envío</span><strong>{{ p.metodoEntrega === 'RECOGIDA' ? 'Sin envío' : 'Se acuerda con el productor' }}</strong></p>
        </section>

        <section class="bloque tarjeta">
          <h2>Productos</h2>
          @for (d of p.detalles; track d.id) {
            <p class="fila"><span>{{ d.producto.nombre }} · {{ d.cantidad }} {{ d.producto.unidad | unidad: d.cantidad }} × {{ d.precioUnitario | cop }}</span>
              <strong>{{ +d.precioUnitario * d.cantidad | cop }}</strong></p>
          }
          <p class="fila total"><span>Total de productos</span><strong>{{ p.total | cop }}</strong></p>
        </section>

        @if (!esProductor && p.estado === 'ENTREGADO') {
          <section class="bloque tarjeta">
            @if (p.calificacion; as c) {
              <h2>Tu calificación</h2>
              <div class="estrellas">@for (n of [1,2,3,4,5]; track n) { <ion-icon [name]="n <= c.puntaje ? 'star' : 'star-outline'" color="warning" /> }</div>
            } @else {
              <h2>¿Cómo te fue con este productor?</h2>
              <div class="estrellas">
                @for (n of [1,2,3,4,5]; track n) {
                  <ion-button fill="clear" (click)="puntaje.set(n)" [attr.aria-label]="n + ' estrellas'">
                    <ion-icon slot="icon-only" [name]="n <= puntaje() ? 'star' : 'star-outline'" color="warning" />
                  </ion-button>
                }
              </div>
              <ion-textarea fill="outline" placeholder="Comentario (opcional)" maxlength="300" [value]="comentario()" (ionInput)="comentario.set($event.detail.value ?? '')" />
              <ion-button expand="block" class="ion-margin-top" [disabled]="!puntaje()" (click)="calificar()">Enviar calificación</ion-button>
            }
          </section>
        }
      } @else if (fallo()) {
        <app-estado-vacio tipo="error" icono="cloud-offline-outline" titulo="No pudimos cargar el pedido" texto="Revisa tu conexión.">
          <ion-button (click)="cargar()">Reintentar</ion-button>
        </app-estado-vacio>
      } @else {
        <div class="ion-text-center ion-padding"><ion-spinner /></div>
      }
    </ion-content>

    @if (esProductor && pedido(); as p) {
      @if (p.estado === 'PENDIENTE') {
        <ion-footer class="ion-no-border pie acciones">
          <ion-button color="danger" fill="outline" size="large" [disabled]="ocupado()" (click)="cambiar('RECHAZADO')">Rechazar</ion-button>
          <ion-button size="large" [disabled]="ocupado()" (click)="cambiar('ACEPTADO')">Confirmar pedido</ion-button>
        </ion-footer>
      } @else if (siguiente(); as s) {
        <ion-footer class="ion-no-border pie">
          <ion-button expand="block" size="large" [disabled]="ocupado()" (click)="cambiar(s.estado)">{{ s.texto }}</ion-button>
        </ion-footer>
      }
    }
  `,
  styles: `
    .bloque { margin-bottom: 16px; }
    .tarjeta { padding: 14px 16px; border-radius: var(--mc-radio); border: 1px solid var(--mc-borde); background: var(--mc-superficie); }
    h2 { margin: 0 0 10px; font-size: 1.05rem; }
    .persona { margin: 0; display: grid; }
    .persona span { color: var(--mc-tinta-suave); font-size: 0.9rem; }
    .contacto { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 10px; }
    .contacto ion-button { margin: 0; flex: 1; min-width: 130px; }
    .nota { display: flex; gap: 6px; align-items: flex-start; margin: 10px 0 0; font-size: 0.85rem; color: var(--mc-tinta-suave); }
    .fila { display: flex; justify-content: space-between; gap: 12px; margin: 0; padding: 8px 0; border-bottom: 1px solid var(--mc-borde); font-size: 0.92rem; }
    .fila:last-child { border-bottom: 0; }
    .fila span { color: var(--mc-tinta-suave); }
    .fila strong { text-align: right; }
    .fila.total { font-size: 1.05rem; }
    .fila.total span { color: var(--ion-text-color); font-weight: 700; }
    .estrellas { display: flex; font-size: 28px; }
    .pie { padding: 10px 16px calc(10px + var(--ion-safe-area-bottom, 0px)); background: var(--mc-superficie); border-top: 1px solid var(--mc-borde); }
    .acciones { display: flex; gap: 12px; }
    .acciones ion-button { flex: 1; margin: 0; }
  `,
})
export class PedidoDetallePage implements OnInit {
  id = input.required<string>();
  private pedidos = inject(PedidosService);
  private avisos = inject(AvisosService);
  esProductor = inject(AuthService).usuario()?.rol === 'PRODUCTOR';
  pedido = signal<Pedido | null>(null);
  ocupado = signal(false);
  puntaje = signal(0);
  comentario = signal('');
  fallo = signal(false);
  siguiente = computed(() => SIGUIENTE[this.pedido()?.estado ?? 'PENDIENTE'] ?? null);

  /** Teléfono de la otra parte del pedido */
  private telefono = computed(() => {
    const p = this.pedido();
    return this.esProductor ? p?.comprador.telefono : p?.productor.usuario.telefono;
  });
  whatsapp = computed(() => enlaceWhatsApp(this.telefono(), `Hola, te escribo por el pedido #${this.id()} de Minga App.`));
  llamada = computed(() => enlaceLlamada(this.telefono()));

  constructor() {
    addIcons({ star, starOutline, callOutline, logoWhatsapp, shieldCheckmarkOutline, cloudOfflineOutline });
  }

  async ngOnInit() {
    await this.cargar();
  }

  async cargar() {
    this.fallo.set(false);
    try { this.pedido.set(await this.pedidos.detalle(+this.id())); } catch { this.fallo.set(true); }
  }

  async cambiar(estado: EstadoPedido) {
    if (estado === 'RECHAZADO' && !(await this.avisos.confirmar('Rechazar pedido', 'Los productos vuelven a tu inventario.', 'Rechazar'))) return;
    this.ocupado.set(true);
    try {
      await this.pedidos.cambiarEstado(+this.id(), estado);
      await this.cargar();
      this.avisos.exito(estado === 'RECHAZADO' ? 'Pedido rechazado' : `Pedido: ${ESTADOS[estado].texto.toLowerCase()}`);
    } catch (e) {
      this.avisos.error(e);
    } finally {
      this.ocupado.set(false);
    }
  }

  async calificar() {
    try {
      await this.pedidos.calificar(+this.id(), this.puntaje(), this.comentario() || undefined);
      await this.cargar();
      this.avisos.exito('¡Gracias por calificar!');
    } catch (e) {
      this.avisos.error(e);
    }
  }
}
