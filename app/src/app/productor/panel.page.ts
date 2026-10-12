import { Component, computed, inject, signal } from '@angular/core';
import {
  IonContent, IonHeader, IonToolbar, IonTitle, IonCard, IonCardContent, IonGrid, IonRow, IonCol, IonButton, IonIcon,
  IonList, IonItem, IonLabel, IonBadge, IonText, NavController, ViewWillEnter,
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import { addCircleOutline, alertCircleOutline } from 'ionicons/icons';
import { AuthService } from '../core/auth.service';
import { PedidosService } from '../core/pedidos.service';
import { MisProductosService } from '../core/mis-productos.service';
import { AvisosService } from '../core/avisos.service';
import { Pedido, Producto } from '../core/models';
import { CopPipe, EstadoPipe } from '../shared/formato';

@Component({
  selector: 'app-panel',
  imports: [IonContent, IonHeader, IonToolbar, IonTitle, IonCard, IonCardContent, IonGrid, IonRow, IonCol, IonButton, IonIcon,
    IonList, IonItem, IonLabel, IonBadge, IonText, CopPipe, EstadoPipe],
  template: `
    <ion-header><ion-toolbar color="primary"><ion-title>Hola, {{ nombre }}</ion-title></ion-toolbar></ion-header>
    <ion-content class="ion-padding">
      @if (!verificado) {
        <ion-text color="warning"><p><ion-icon name="alert-circle-outline" /> Tu finca está en revisión. Ya puedes publicar productos.</p></ion-text>
      }
      <ion-grid class="ion-no-padding">
        <ion-row>
          <ion-col size="6"><ion-card class="dato"><ion-card-content><h2>{{ pendientes().length }}</h2><p>Pedidos nuevos</p></ion-card-content></ion-card></ion-col>
          <ion-col size="6"><ion-card class="dato"><ion-card-content><h2>{{ vendidoHoy() | cop }}</h2><p>Entregado hoy</p></ion-card-content></ion-card></ion-col>
          <ion-col size="6"><ion-card class="dato"><ion-card-content><h2>{{ activos() }}</h2><p>Productos activos</p></ion-card-content></ion-card></ion-col>
          <ion-col size="6"><ion-card class="dato"><ion-card-content><h2>{{ agotados() }}</h2><p>Sin stock</p></ion-card-content></ion-card></ion-col>
        </ion-row>
      </ion-grid>
      <ion-button expand="block" size="large" (click)="nuevo()"><ion-icon slot="start" name="add-circle-outline" /> Publicar producto</ion-button>

      @if (pendientes().length > 0) {
        <h3>Pedidos por atender</h3>
        <ion-list lines="full">
          @for (p of pendientes(); track p.id) {
            <ion-item button detail (click)="abrir(p)">
              <ion-label>#{{ p.id }} · {{ p.comprador.nombre }}<p>{{ p.total | cop }}</p></ion-label>
              <ion-badge slot="end" [color]="p.estado | estado: 'color'">{{ p.estado | estado }}</ion-badge>
            </ion-item>
          }
        </ion-list>
      }
    </ion-content>
  `,
  styles: `
    .dato { margin: 4px; text-align: center; }
    .dato h2 { font-size: 22px; font-weight: 700; color: var(--ion-color-primary); margin: 0; }
    .dato p { margin: 0; font-size: 13px; }
  `,
})
export class PanelPage implements ViewWillEnter {
  private pedidosSrv = inject(PedidosService);
  private productosSrv = inject(MisProductosService);
  private avisos = inject(AvisosService);
  private nav = inject(NavController);
  private usuario = inject(AuthService).usuario();
  nombre = this.usuario?.nombre.split(' ')[0] ?? '';
  verificado = this.usuario?.productor?.verificado ?? false;
  pedidos = signal<Pedido[]>([]);
  productos = signal<Producto[]>([]);

  pendientes = computed(() => this.pedidos().filter((p) => ['PENDIENTE', 'ACEPTADO', 'LISTO'].includes(p.estado)));
  activos = computed(() => this.productos().filter((p) => p.activo && p.stock > 0).length);
  agotados = computed(() => this.productos().filter((p) => p.activo && p.stock === 0).length);
  vendidoHoy = computed(() => {
    const hoy = new Date().toDateString();
    return this.pedidos().filter((p) => p.estado === 'ENTREGADO' && new Date(p.creadoEn).toDateString() === hoy)
      .reduce((s, p) => s + Number(p.total), 0);
  });

  constructor() {
    addIcons({ addCircleOutline, alertCircleOutline });
  }

  async ionViewWillEnter() {
    try {
      const [pe, pr] = await Promise.all([this.pedidosSrv.listar(), this.productosSrv.listar()]);
      this.pedidos.set(pe);
      this.productos.set(pr);
    } catch (e) {
      this.avisos.error(e);
    }
  }

  nuevo() {
    this.nav.navigateForward('/productor/producto/nuevo');
  }
  abrir(p: Pedido) {
    this.nav.navigateForward(['/productor/pedido', p.id]);
  }
}
