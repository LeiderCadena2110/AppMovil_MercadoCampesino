import { Component, OnInit, computed, inject, input, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import {
  IonContent, IonHeader, IonToolbar, IonTitle, IonButtons, IonBackButton, IonList, IonListHeader, IonItem, IonLabel,
  IonNote, IonBadge, IonButton, IonFooter, IonIcon, IonSpinner, IonTextarea,
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import { star, starOutline, callOutline } from 'ionicons/icons';
import { AuthService } from '../core/auth.service';
import { PedidosService } from '../core/pedidos.service';
import { AvisosService } from '../core/avisos.service';
import { EstadoPedido, Pedido } from '../core/models';
import { CopPipe, EstadoPipe } from './formato';

const SIGUIENTE: Partial<Record<EstadoPedido, { estado: EstadoPedido; texto: string }>> = {
  ACEPTADO: { estado: 'LISTO', texto: 'Marcar como listo' },
  LISTO: { estado: 'ENTREGADO', texto: 'Marcar como entregado' },
};

/** Detalle del pedido. El productor cambia el estado; el comprador califica cuando se entrega. */
@Component({
  selector: 'app-pedido-detalle',
  imports: [DatePipe, IonContent, IonHeader, IonToolbar, IonTitle, IonButtons, IonBackButton, IonList, IonListHeader, IonItem,
    IonLabel, IonNote, IonBadge, IonButton, IonFooter, IonIcon, IonSpinner, IonTextarea, CopPipe, EstadoPipe],
  template: `
    <ion-header><ion-toolbar color="primary">
      <ion-buttons slot="start"><ion-back-button [defaultHref]="esProductor ? '/productor/tabs/pedidos' : '/comprador/tabs/pedidos'" text="" /></ion-buttons>
      <ion-title>Pedido #{{ id() }}</ion-title>
    </ion-toolbar></ion-header>
    <ion-content>
      @if (pedido(); as p) {
        <ion-list lines="full">
          <ion-item>
            <ion-label>Estado</ion-label>
            <ion-badge slot="end" [color]="p.estado | estado: 'color'">{{ p.estado | estado }}</ion-badge>
          </ion-item>
          <ion-item><ion-label>Fecha</ion-label><ion-note slot="end">{{ p.creadoEn | date: 'd MMM y, h:mm a' }}</ion-note></ion-item>
          <ion-item><ion-label>Entrega</ion-label><ion-note slot="end">{{ p.metodoEntrega === 'RECOGIDA' ? 'Recoge en finca' : 'Contra entrega' }}</ion-note></ion-item>
          <ion-item><ion-label class="ion-text-wrap"><p>Dirección</p><h3>{{ p.direccion }}</h3></ion-label></ion-item>
          @if (esProductor) {
            <ion-item [href]="p.comprador.telefono ? 'tel:' + p.comprador.telefono : null">
              <ion-icon slot="start" name="call-outline" /><ion-label>{{ p.comprador.nombre }}<p>{{ p.comprador.telefono }}</p></ion-label>
            </ion-item>
          } @else {
            <ion-item [href]="p.productor.usuario.telefono ? 'tel:' + p.productor.usuario.telefono : null">
              <ion-icon slot="start" name="call-outline" /><ion-label>{{ p.productor.nombreFinca }}<p>{{ p.productor.usuario.nombre }} · {{ p.productor.usuario.telefono }}</p></ion-label>
            </ion-item>
          }
        </ion-list>
        <ion-list lines="full">
          <ion-list-header>Productos</ion-list-header>
          @for (d of p.detalles; track d.id) {
            <ion-item>
              <ion-label>{{ d.producto.nombre }}<p>{{ d.cantidad }} {{ d.producto.unidad }} × {{ d.precioUnitario | cop }}</p></ion-label>
              <ion-note slot="end">{{ +d.precioUnitario * d.cantidad | cop }}</ion-note>
            </ion-item>
          }
          <ion-item><ion-label><strong>Total</strong></ion-label><ion-note slot="end"><strong>{{ p.total | cop }}</strong></ion-note></ion-item>
        </ion-list>

        @if (!esProductor && p.estado === 'ENTREGADO') {
          <div class="ion-padding">
            @if (p.calificacion; as c) {
              <p>Tu calificación:</p>
              <div class="estrellas">@for (n of [1,2,3,4,5]; track n) { <ion-icon [name]="n <= c.puntaje ? 'star' : 'star-outline'" color="warning" /> }</div>
            } @else {
              <p>¿Cómo te fue con este productor?</p>
              <div class="estrellas">
                @for (n of [1,2,3,4,5]; track n) {
                  <ion-button fill="clear" (click)="puntaje.set(n)" [attr.aria-label]="n + ' estrellas'">
                    <ion-icon slot="icon-only" [name]="n <= puntaje() ? 'star' : 'star-outline'" color="warning" />
                  </ion-button>
                }
              </div>
              <ion-textarea fill="outline" placeholder="Comentario (opcional)" [value]="comentario()" (ionInput)="comentario.set($event.detail.value ?? '')" />
              <ion-button expand="block" class="ion-margin-top" [disabled]="!puntaje()" (click)="calificar()">Enviar calificación</ion-button>
            }
          </div>
        }
      } @else {
        <div class="ion-text-center ion-padding"><ion-spinner /></div>
      }
    </ion-content>

    @if (esProductor && pedido(); as p) {
      @if (p.estado === 'PENDIENTE') {
        <ion-footer class="ion-padding acciones">
          <ion-button color="danger" fill="outline" size="large" [disabled]="ocupado()" (click)="cambiar('RECHAZADO')">Rechazar</ion-button>
          <ion-button color="success" size="large" [disabled]="ocupado()" (click)="cambiar('ACEPTADO')">Aceptar</ion-button>
        </ion-footer>
      } @else if (siguiente(); as s) {
        <ion-footer class="ion-padding">
          <ion-button expand="block" size="large" [disabled]="ocupado()" (click)="cambiar(s.estado)">{{ s.texto }}</ion-button>
        </ion-footer>
      }
    }
  `,
  styles: `
    .acciones { display: flex; gap: 12px; }
    .acciones ion-button { flex: 1; }
    .estrellas { display: flex; font-size: 28px; }
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
  siguiente = computed(() => SIGUIENTE[this.pedido()?.estado ?? 'PENDIENTE'] ?? null);

  constructor() {
    addIcons({ star, starOutline, callOutline });
  }

  async ngOnInit() {
    await this.cargar();
  }

  async cargar() {
    try { this.pedido.set(await this.pedidos.detalle(+this.id())); } catch (e) { this.avisos.error(e); }
  }

  async cambiar(estado: EstadoPedido) {
    if (estado === 'RECHAZADO' && !(await this.avisos.confirmar('Rechazar pedido', 'Los productos vuelven a tu inventario.', 'Rechazar'))) return;
    this.ocupado.set(true);
    try {
      await this.pedidos.cambiarEstado(+this.id(), estado);
      await this.cargar();
      this.avisos.exito('Estado actualizado');
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
