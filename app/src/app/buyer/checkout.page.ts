import { Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import {
  IonContent, IonHeader, IonToolbar, IonTitle, IonButtons, IonBackButton, IonList, IonListHeader, IonItem, IonLabel,
  IonTextarea, IonRadioGroup, IonRadio, IonButton, IonFooter, IonNote, IonSpinner, NavController,
} from '@ionic/angular';
import { vibrar } from '../core/haptics';
import { CarritoService } from '../core/cart.service';
import { PedidosService, nuevaClave } from '../core/orders.service';
import { AvisosService } from '../core/notifications.service';
import { MetodoEntrega } from '../core/models';
import { CopPipe } from '../shared/format';
import { PagosService } from '../core/payments.service';
import { mensajeError } from '../core/auth.interceptor';

@Component({
  selector: 'app-checkout',
  imports: [ReactiveFormsModule, IonContent, IonHeader, IonToolbar, IonTitle, IonButtons, IonBackButton, IonList, IonListHeader,
    IonItem, IonLabel, IonTextarea, IonRadioGroup, IonRadio, IonButton, IonFooter, IonNote, IonSpinner, CopPipe],
  template: `
    <ion-header><ion-toolbar color="primary">
      <ion-buttons slot="start"><ion-back-button defaultHref="/comprador/tabs/carrito" text="" /></ion-buttons>
      <ion-title>Confirmar pedido</ion-title>
    </ion-toolbar></ion-header>
    <ion-content>
      <form [formGroup]="form">
        <ion-list lines="full">
          <ion-list-header>¿Cómo recibes el pedido?</ion-list-header>
          <ion-radio-group formControlName="metodoEntrega">
            <ion-item><ion-radio value="CONTRA_ENTREGA">{{ pagosDisponibles() ? 'Me lo llevan a domicilio' : 'Me lo llevan (pago contra entrega)' }}</ion-radio></ion-item>
            <ion-item><ion-radio value="RECOGIDA">Lo recojo en la finca</ion-radio></ion-item>
          </ion-radio-group>
          <ion-item>
            <ion-textarea label="Dirección y referencias" labelPlacement="stacked" formControlName="direccion" [autoGrow]="true"
              placeholder="Calle 18 # 25-30, barrio Las Cuadras, Pasto" />
          </ion-item>
        </ion-list>
        @if (pagosDisponibles()) {
          <ion-list lines="full">
            <ion-list-header>¿Cómo pagas?</ion-list-header>
            <ion-radio-group formControlName="pago">
              <ion-item><ion-radio value="ENTREGA">{{ form.controls.metodoEntrega.value === 'RECOGIDA' ? 'Al recoger' : 'Al recibir (efectivo)' }}</ion-radio></ion-item>
              <ion-item><ion-radio value="LINEA">Pagar ahora en línea<br /><small class="sub">PSE, tarjeta o Nequi, en una página segura</small></ion-radio></ion-item>
            </ion-radio-group>
          </ion-list>
        }
      </form>
      <ion-list lines="none">
        <ion-list-header>Resumen</ion-list-header>
        @for (g of carrito.porProductor(); track g.finca) {
          <ion-item><ion-label>{{ g.finca }} <p>{{ g.items.length }} producto(s)</p></ion-label><ion-note slot="end">{{ g.subtotal | cop }}</ion-note></ion-item>
        }
      </ion-list>
      <p class="ion-padding-horizontal nota">
        @if (enLinea()) {
          Pagas los productos ahora. {{ form.controls.metodoEntrega.value === 'RECOGIDA' ? 'Recoges en la finca, sin costo de envío.' : 'El envío no está incluido: lo acuerdas con el productor.' }}
          El productor prepara tu pedido cuando el pago se apruebe.
        } @else {
          {{ form.controls.metodoEntrega.value === 'RECOGIDA'
            ? 'Recoges en la finca: no hay costo de envío. El productor te confirmará la hora por WhatsApp o llamada.'
            : 'Pagas al recibir. El costo del envío no está incluido: lo acuerdas con el productor cuando confirme el pedido.' }}
        }
      </p>
      @if (carrito.porProductor().length > 1) {
        <p class="ion-padding-horizontal nota">Tu compra se divide en {{ carrito.porProductor().length }} pedidos, uno por finca.</p>
      }
    </ion-content>
    <ion-footer class="ion-padding">
      <ion-button expand="block" size="large" [disabled]="form.invalid || enviando()" (click)="confirmar()">
        @if (enviando()) { <ion-spinner name="crescent" /> }
        @else if (enLinea()) { Pagar {{ carrito.total() | cop }} }
        @else { Hacer pedido · {{ carrito.total() | cop }}{{ form.controls.metodoEntrega.value === 'RECOGIDA' ? '' : ' + envío' }} }
      </ion-button>
    </ion-footer>
  `,
  styles: `
    .nota { color: var(--ion-color-medium); font-size: 14px; }
    .sub { color: var(--mc-tinta-suave); font-weight: 400; }
  `,
})
export class CheckoutPage {
  carrito = inject(CarritoService);
  private pedidos = inject(PedidosService);
  private avisos = inject(AvisosService);
  private nav = inject(NavController);
  enviando = signal(false);
  /** Se conserva mientras se reintenta la misma compra; si cambia la compra, se genera otra */
  private clave = nuevaClave();
  private ultimoIntento = '';
  form = inject(FormBuilder).nonNullable.group({
    metodoEntrega: ['CONTRA_ENTREGA' as MetodoEntrega, Validators.required],
    direccion: ['', [Validators.required, Validators.minLength(5)]],
    pago: ['ENTREGA' as 'ENTREGA' | 'LINEA'],
  });
  private pagos = inject(PagosService);
  pagosDisponibles = signal(false);
  private pagoElegido = toSignal(this.form.controls.pago.valueChanges, { initialValue: 'ENTREGA' as const });
  enLinea = computed(() => this.pagosDisponibles() && this.pagoElegido() === 'LINEA');

  constructor() {
    this.pagos.disponible().then((d) => this.pagosDisponibles.set(d));
  }

  async confirmar() {
    this.enviando.set(true);
    try {
      const { pago, ...entrega } = this.form.getRawValue();
      const datos = {
        ...entrega,
        pagarEnLinea: this.enLinea(),
        items: this.carrito.items().map((i) => ({ productoId: i.producto.id, cantidad: i.cantidad })),
      };
      const huella = JSON.stringify(datos);
      if (this.ultimoIntento && huella !== this.ultimoIntento) this.clave = nuevaClave();
      this.ultimoIntento = huella;
      const creados = await this.pedidos.crear(datos, this.clave);
      this.clave = nuevaClave();
      this.ultimoIntento = '';
      this.carrito.vaciar();
      if (datos.pagarEnLinea) {
        await this.pagarAhora(creados.map((p) => p.id));
      } else {
        vibrar.exito();
        await this.avisos.exito(creados.length > 1 ? `${creados.length} pedidos enviados` : 'Pedido enviado');
      }
      // navigateRoot reinicia la pila: "atrás" no regresa al checkout
      await this.nav.navigateRoot('/comprador/tabs/pedidos');
    } catch (e) {
      this.avisos.error(e);
    } finally {
      this.enviando.set(false);
    }
  }

  /** Los pedidos ya quedaron creados: si el pago falla, se reintenta desde el detalle del pedido */
  private async pagarAhora(ids: number[]) {
    try {
      const estado = await this.pagos.pagar(ids);
      if (estado === 'APROBADO') {
        vibrar.exito();
        await this.avisos.exito('¡Pago aprobado! La finca ya puede preparar tu pedido');
      } else if (estado === 'RECHAZADO') {
        vibrar.aviso();
        await this.avisos.error(new Error('El pago no se aprobó. Tu pedido quedó guardado: puedes pagarlo desde Pedidos.'));
      } else {
        await this.avisos.exito('Pago en proceso. Te avisaremos cuando se confirme.');
      }
    } catch (e) {
      await this.avisos.error(new Error(`Tu pedido quedó guardado, pero no pudimos abrir el pago: ${mensajeError(e)}. Págalo desde Pedidos.`));
    }
  }
}
