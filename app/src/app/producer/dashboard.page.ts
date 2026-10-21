import { Component, computed, inject, signal } from '@angular/core';
import {
  IonContent, IonHeader, IonToolbar, IonButton, IonIcon,
  IonBadge, NavController, ViewWillEnter,
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import { addCircleOutline, alertCircleOutline } from 'ionicons/icons';
import { AuthService } from '../core/auth.service';
import { PedidosService } from '../core/orders.service';
import { MisProductosService } from '../core/my-products.service';
import { AvisosService } from '../core/notifications.service';
import { Pedido, Producto } from '../core/models';
import { CopPipe, EstadoPipe } from '../shared/format';

@Component({
  selector: 'app-panel',
  imports: [IonContent, IonHeader, IonToolbar, IonButton, IonIcon,
    IonBadge, CopPipe, EstadoPipe],
  template: `
    <ion-header class="ion-no-border"><ion-toolbar>
      <div class="saludo">
        <p>{{ finca }}</p>
        <h1>Hola, {{ nombre }}</h1>
      </div>
    </ion-toolbar></ion-header>
    <ion-content class="ion-padding">
      @if (!verificado) {
        <p class="revision"><ion-icon name="alert-circle-outline" /> Tu finca está en revisión. Mientras tanto ya puedes publicar productos.</p>
      }

      <section class="resumen" aria-label="Resumen de hoy">
        <div class="dato" [class.alerta]="pendientes().length > 0">
          <strong>{{ pendientes().length }}</strong><span>Pedidos por atender</span>
        </div>
        <div class="dato"><strong>{{ vendidoHoy() | cop }}</strong><span>Entregado hoy</span></div>
        <div class="dato"><strong>{{ activos() }}</strong><span>Productos a la venta</span></div>
        <div class="dato" [class.aviso]="agotados() > 0"><strong>{{ agotados() }}</strong><span>Sin cosecha disponible</span></div>
      </section>

      <ion-button expand="block" size="large" (click)="nuevo()"><ion-icon slot="start" name="add-circle-outline" /> Publicar producto</ion-button>

      @if (pendientes().length > 0) {
        <h2 class="seccion">Pedidos por atender</h2>
        <div class="pedidos">
          @for (p of pendientes(); track p.id) {
            <button type="button" class="pedido" (click)="abrir(p)">
              <span class="quien">
                <strong>{{ p.comprador.nombre }}</strong>
                <small>Pedido #{{ p.id }} · {{ p.total | cop }}</small>
              </span>
              <ion-badge [color]="p.estado | estado: 'color'">{{ p.estado | estado }}</ion-badge>
            </button>
          }
        </div>
      } @else {
        <p class="calma">No tienes pedidos pendientes. Cuando alguien compre, aparecerá aquí.</p>
      }
    </ion-content>
  `,
  styles: `
    .saludo { padding: 10px 16px 2px; }
    .saludo p { margin: 0; color: var(--mc-barro); font-size: 0.95rem; }
    .saludo h1 { margin: 2px 0 0; font-size: 1.7rem; }
    .revision { display: flex; gap: 8px; align-items: start; margin: 0 0 14px; padding: 12px 14px; border-radius: var(--mc-radio);
      background: color-mix(in srgb, var(--mc-maiz) 22%, var(--mc-superficie)); font-size: 0.92rem; }
    .resumen { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 16px; }
    .dato { padding: 14px; border-radius: var(--mc-radio); background: var(--mc-superficie); border: 1px solid var(--mc-borde); }
    .dato strong { display: block; font-family: var(--mc-titulos); font-size: 1.6rem; font-weight: 800; line-height: 1.1; }
    .dato span { font-size: 0.85rem; color: var(--ion-color-medium); }
    .dato.alerta { background: var(--mc-paramo); border-color: var(--mc-paramo); color: #fff; }
    .dato.alerta span { color: #cfe0d2; }
    .dato.aviso strong { color: var(--mc-barro); }
    .seccion { font-size: 1.15rem; margin: 22px 0 10px; }
    .pedidos { display: grid; gap: 8px; }
    .pedido { display: flex; align-items: center; justify-content: space-between; gap: 10px; width: 100%; text-align: left;
      padding: 14px; border-radius: var(--mc-radio); border: 1px solid var(--mc-borde); background: var(--mc-superficie);
      font: inherit; color: inherit; cursor: pointer; }
    .quien strong { display: block; }
    .quien small { color: var(--ion-color-medium); }
    .calma { color: var(--ion-color-medium); text-align: center; margin-top: 28px; }
  `,
})
export class PanelPage implements ViewWillEnter {
  private pedidosSrv = inject(PedidosService);
  private productosSrv = inject(MisProductosService);
  private avisos = inject(AvisosService);
  private nav = inject(NavController);
  private usuario = inject(AuthService).usuario();
  nombre = (() => {
    // "Don Efraín Rosero" -> "Don Efraín"; "María López" -> "María"
    const partes = (this.usuario?.nombre ?? '').split(' ');
    return /^(don|doña)$/i.test(partes[0]) ? partes.slice(0, 2).join(' ') : partes[0];
  })();
  finca = this.usuario?.productor?.nombreFinca ?? 'Tu finca';
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
