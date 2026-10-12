import { Component, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import {
  IonContent, IonHeader, IonToolbar, IonTitle, IonList, IonItem, IonLabel, IonBadge, IonNote, IonRefresher,
  IonRefresherContent, IonSegment, IonSegmentButton, NavController, RefresherCustomEvent, ViewWillEnter,
} from '@ionic/angular';
import { AuthService } from '../core/auth.service';
import { PedidosService } from '../core/pedidos.service';
import { AvisosService } from '../core/avisos.service';
import { Pedido } from '../core/models';
import { CopPipe, EstadoPipe } from './formato';

/** Lista de pedidos: el comprador ve los suyos; el productor, los que recibe */
@Component({
  selector: 'app-pedidos-lista',
  imports: [DatePipe, IonContent, IonHeader, IonToolbar, IonTitle, IonList, IonItem, IonLabel, IonBadge, IonNote, IonRefresher,
    IonRefresherContent, IonSegment, IonSegmentButton, CopPipe, EstadoPipe],
  template: `
    <ion-header>
      <ion-toolbar color="primary"><ion-title>{{ esProductor ? 'Pedidos recibidos' : 'Mis pedidos' }}</ion-title></ion-toolbar>
      <ion-toolbar>
        <ion-segment [value]="filtro()" (ionChange)="filtro.set($any($event.detail.value))">
          <ion-segment-button value="activos">Activos</ion-segment-button>
          <ion-segment-button value="cerrados">Cerrados</ion-segment-button>
        </ion-segment>
      </ion-toolbar>
    </ion-header>
    <ion-content>
      <ion-refresher slot="fixed" (ionRefresh)="refrescar($event)"><ion-refresher-content /></ion-refresher>
      <ion-list lines="full">
        @for (p of visibles(); track p.id) {
          <ion-item button detail (click)="abrir(p)">
            <ion-label>
              <h3>Pedido #{{ p.id }} · {{ esProductor ? p.comprador.nombre : p.productor.nombreFinca }}</h3>
              <p>{{ p.creadoEn | date: 'd MMM, h:mm a' }} · {{ p.detalles.length }} producto(s)</p>
              <ion-note>{{ p.total | cop }}</ion-note>
            </ion-label>
            <ion-badge slot="end" [color]="p.estado | estado: 'color'">{{ p.estado | estado }}</ion-badge>
          </ion-item>
        } @empty {
          <p class="ion-text-center ion-padding">No hay pedidos aquí.</p>
        }
      </ion-list>
    </ion-content>
  `,
})
export class PedidosListaPage implements ViewWillEnter {
  private pedidos = inject(PedidosService);
  private avisos = inject(AvisosService);
  private nav = inject(NavController);
  esProductor = inject(AuthService).usuario()?.rol === 'PRODUCTOR';
  lista = signal<Pedido[]>([]);
  filtro = signal<'activos' | 'cerrados'>('activos');

  visibles = () => this.lista().filter((p) =>
    this.filtro() === 'activos' ? !['ENTREGADO', 'RECHAZADO'].includes(p.estado) : ['ENTREGADO', 'RECHAZADO'].includes(p.estado));

  // Se recarga cada vez que se entra a la pestaña
  ionViewWillEnter() {
    this.cargar();
  }

  async cargar() {
    try { this.lista.set(await this.pedidos.listar()); } catch (e) { this.avisos.error(e); }
  }

  async refrescar(ev: RefresherCustomEvent) {
    await this.cargar();
    ev.target.complete();
  }

  abrir(p: Pedido) {
    this.nav.navigateForward([this.esProductor ? '/productor/pedido' : '/comprador/pedido', p.id]);
  }
}
