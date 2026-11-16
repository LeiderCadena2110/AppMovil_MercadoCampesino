import { Component, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import {
  IonContent, IonHeader, IonToolbar, IonList, IonItem, IonLabel, IonBadge, IonNote, IonRefresher,
  IonRefresherContent, IonSegment, IonSegmentButton, IonInfiniteScroll, IonInfiniteScrollContent, NavController,
  RefresherCustomEvent, InfiniteScrollCustomEvent, ViewWillEnter,
} from '@ionic/angular';
import { AuthService } from '../core/auth.service';
import { PedidosService } from '../core/orders.service';
import { NovedadesPedidosService } from '../core/order-updates.service';
import { AvisosService } from '../core/notifications.service';
import { Pedido } from '../core/models';
import { CopPipe, EstadoPipe } from './format';
import { EstadoVacioComponent } from './empty-state.component';
import { addIcons } from 'ionicons';
import { receiptOutline } from 'ionicons/icons';

/** Lista de pedidos: el comprador ve los suyos; el productor, los que recibe */
@Component({
  selector: 'app-pedidos-lista',
  imports: [DatePipe, IonContent, IonHeader, IonToolbar, IonList, IonItem, IonLabel, IonBadge, IonNote, IonRefresher,
    IonRefresherContent, IonSegment, IonSegmentButton, IonInfiniteScroll, IonInfiniteScrollContent, CopPipe, EstadoPipe,
    EstadoVacioComponent],
  styles: `
    .pago { color: var(--mc-barro); font-weight: 700; }
    .titulo { margin: 10px 16px 0; font-size: 1.7rem; }
    .segmento { padding: 4px 12px 8px; }
  `,
  template: `
    <ion-header class="ion-no-border">
      <ion-toolbar><h1 class="titulo">{{ esProductor ? 'Pedidos recibidos' : 'Mis pedidos' }}</h1></ion-toolbar>
      <ion-toolbar class="segmento">
        <ion-segment [value]="filtro()" (ionChange)="cambiarFiltro($any($event.detail.value))">
          <ion-segment-button value="activos">En curso</ion-segment-button>
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
              <ion-note>{{ p.total | cop }}
                @if (p.estado === 'PENDIENTE' && p.pagoEstado === 'PENDIENTE') { · <span class="pago">esperando pago</span> }
                @else if (p.estado === 'PENDIENTE' && p.pagoEstado === 'RECHAZADO') { · <span class="pago">pago rechazado</span> }
                @else if (p.pagoEstado === 'APROBADO') { · pagado en línea }
              </ion-note>
            </ion-label>
            <ion-badge slot="end" [color]="p.estado | estado: 'color'">{{ p.estado | estado }}</ion-badge>
          </ion-item>
        } @empty {
          @if (filtro() === 'activos') {
            <app-estado-vacio icono="receipt-outline" titulo="No tienes pedidos en curso"
              [texto]="esProductor ? 'Cuando un comprador te haga un pedido, aparecerá aquí para que lo confirmes.' : 'Cuando hagas un pedido, aquí verás cada paso: recibido, confirmado, listo y entregado.'" />
          } @else {
            <app-estado-vacio icono="receipt-outline" titulo="Aún no hay pedidos cerrados" texto="Aquí quedan los pedidos entregados o rechazados." />
          }
        }
      </ion-list>
      <ion-infinite-scroll [disabled]="!hayMas()" (ionInfinite)="mas($event)">
        <ion-infinite-scroll-content loadingText="Cargando pedidos anteriores..." />
      </ion-infinite-scroll>
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

  constructor() {
    addIcons({ receiptOutline });
  }

  /** La API ya filtra por activos/cerrados y pagina de a 30 */
  visibles = () => this.lista();
  hayMas = signal(false);
  private pagina = 1;

  // Se recarga cada vez que se entra a la pestaña
  private novedades = inject(NovedadesPedidosService);

  ionViewWillEnter() {
    this.novedades.marcarVistas();
    this.cargar();
  }

  async cargar() {
    try {
      const r = await this.pedidos.pagina(1, this.filtro());
      this.pagina = 1;
      this.lista.set(r.items);
      this.hayMas.set(r.hayMas);
    } catch (e) {
      this.avisos.error(e);
    }
  }

  cambiarFiltro(f: 'activos' | 'cerrados') {
    this.filtro.set(f);
    this.lista.set([]);
    this.cargar();
  }

  async mas(ev: InfiniteScrollCustomEvent) {
    try {
      const r = await this.pedidos.pagina(this.pagina + 1, this.filtro());
      this.pagina++;
      this.lista.update((l) => [...l, ...r.items]);
      this.hayMas.set(r.hayMas);
    } catch (e) {
      this.avisos.error(e);
    } finally {
      ev.target.complete();
    }
  }

  async refrescar(ev: RefresherCustomEvent) {
    await this.cargar();
    ev.target.complete();
  }

  abrir(p: Pedido) {
    this.nav.navigateForward([this.esProductor ? '/productor/pedido' : '/comprador/pedido', p.id]);
  }
}
