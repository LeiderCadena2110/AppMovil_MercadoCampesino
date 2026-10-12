import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import {
  IonContent, IonHeader, IonToolbar, IonTitle, IonButtons, IonBackButton, IonList, IonListHeader, IonItem, IonLabel,
  IonTextarea, IonRadioGroup, IonRadio, IonButton, IonFooter, IonNote, IonSpinner, NavController,
} from '@ionic/angular';
import { CarritoService } from '../core/carrito.service';
import { PedidosService } from '../core/pedidos.service';
import { AvisosService } from '../core/avisos.service';
import { MetodoEntrega } from '../core/models';
import { CopPipe } from '../shared/formato';

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
            <ion-item><ion-radio value="CONTRA_ENTREGA">Me lo llevan (pago contra entrega)</ion-radio></ion-item>
            <ion-item><ion-radio value="RECOGIDA">Lo recojo en la finca</ion-radio></ion-item>
          </ion-radio-group>
          <ion-item>
            <ion-textarea label="Dirección y referencias" labelPlacement="stacked" formControlName="direccion" [autoGrow]="true"
              placeholder="Calle 18 # 25-30, barrio Las Cuadras, Pasto" />
          </ion-item>
        </ion-list>
      </form>
      <ion-list lines="none">
        <ion-list-header>Resumen</ion-list-header>
        @for (g of carrito.porProductor(); track g.finca) {
          <ion-item><ion-label>{{ g.finca }} <p>{{ g.items.length }} producto(s)</p></ion-label><ion-note slot="end">{{ g.subtotal | cop }}</ion-note></ion-item>
        }
      </ion-list>
      @if (carrito.porProductor().length > 1) {
        <p class="ion-padding-horizontal nota">Tu compra se divide en {{ carrito.porProductor().length }} pedidos, uno por finca.</p>
      }
    </ion-content>
    <ion-footer class="ion-padding">
      <ion-button expand="block" size="large" [disabled]="form.invalid || enviando()" (click)="confirmar()">
        @if (enviando()) { <ion-spinner name="crescent" /> } @else { Hacer pedido · {{ carrito.total() | cop }} }
      </ion-button>
    </ion-footer>
  `,
  styles: `.nota { color: var(--ion-color-medium); font-size: 14px; }`,
})
export class CheckoutPage {
  carrito = inject(CarritoService);
  private pedidos = inject(PedidosService);
  private avisos = inject(AvisosService);
  private nav = inject(NavController);
  enviando = signal(false);
  form = inject(FormBuilder).nonNullable.group({
    metodoEntrega: ['CONTRA_ENTREGA' as MetodoEntrega, Validators.required],
    direccion: ['', [Validators.required, Validators.minLength(5)]],
  });

  async confirmar() {
    this.enviando.set(true);
    try {
      const creados = await this.pedidos.crear({
        ...this.form.getRawValue(),
        items: this.carrito.items().map((i) => ({ productoId: i.producto.id, cantidad: i.cantidad })),
      });
      this.carrito.vaciar();
      await this.avisos.exito(creados.length > 1 ? `${creados.length} pedidos enviados` : 'Pedido enviado');
      // navigateRoot reinicia la pila: "atrás" no regresa al checkout
      await this.nav.navigateRoot('/comprador/tabs/pedidos');
    } catch (e) {
      this.avisos.error(e);
    } finally {
      this.enviando.set(false);
    }
  }
}
