import { Component, computed, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import {
  IonContent, IonHeader, IonToolbar, IonButton, IonIcon,
  IonBadge, NavController, ViewWillEnter,
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import { addCircleOutline, alertCircleOutline, warningOutline, leafOutline } from 'ionicons/icons';
import { AuthService } from '../core/auth.service';
import { PedidosService } from '../core/orders.service';
import { MisProductosService } from '../core/my-products.service';
import { AvisosService } from '../core/notifications.service';
import { Pedido, Producto } from '../core/models';
import { CopPipe, EstadoPipe, UnidadPipe } from '../shared/format';
import { GraficoVentasComponent, VentaDia } from '../shared/sales-chart.component';
import { EstadoSincronizacionComponent } from '../shared/sync-status.component';

const UMBRAL_POCOS = 5;

@Component({
  selector: 'app-panel',
  imports: [IonContent, IonHeader, IonToolbar, IonButton, IonIcon,
    IonBadge, CopPipe, EstadoPipe, UnidadPipe, GraficoVentasComponent, EstadoSincronizacionComponent],
  template: `
    <ion-header class="ion-no-border"><ion-toolbar>
      <div class="saludo">
        <p>{{ finca }}</p>
        <h1>Hola, {{ nombre }}</h1>
      </div>
      <app-estado-sincronizacion />
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

      @if (ventas().length) { <app-grafico-ventas [dias]="ventas()" /> }

      @if (pocos().length) {
        <section class="pocos" aria-labelledby="titulo-pocos">
          <h2 id="titulo-pocos" class="seccion"><ion-icon name="warning-outline" /> Se están acabando</h2>
          @for (p of pocos(); track p.id) {
            <button type="button" class="poco" (click)="editar(p)" [attr.aria-label]="'Actualizar existencias de ' + p.nombre">
              <span class="mini">@if (p.miniaturaUrl) { <img [src]="p.miniaturaUrl" alt="" /> } @else { <ion-icon name="leaf-outline" /> }</span>
              <span class="quien"><strong>{{ p.nombre }}</strong><small>Quedan {{ p.stock }} {{ p.unidad | unidad: p.stock }}</small></span>
              <span class="accion">Actualizar</span>
            </button>
          }
        </section>
      }

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
      background: var(--mc-suelo); font-size: 0.92rem; }
    .resumen { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 16px; }
    .dato { padding: 14px; border-radius: var(--mc-radio); background: var(--mc-superficie); border: 0; box-shadow: var(--mc-e2); }
    .dato strong { display: block; font-family: var(--mc-titulos); font-size: 1.6rem; font-weight: 800; line-height: 1.1; }
    .dato span { font-size: 0.85rem; color: var(--ion-color-medium); }
    .dato.alerta { background: var(--mc-marca); border-color: var(--mc-marca); color: var(--mc-marca-texto); }
    .dato.alerta span { color: var(--mc-marca-suave); }
    .dato.aviso strong { color: var(--mc-barro); }
    .seccion { font-size: 1.15rem; margin: 22px 0 10px; }
    .pedidos { display: grid; gap: 8px; }
    .pedido { display: flex; align-items: center; justify-content: space-between; gap: 10px; width: 100%; text-align: left;
      padding: 14px; border-radius: var(--mc-radio); border: 0; box-shadow: var(--mc-e2); background: var(--mc-superficie);
      font: inherit; color: inherit; cursor: pointer; }
    .quien strong { display: block; }
    .quien small { color: var(--ion-color-medium); }
    .pocos { display: grid; gap: 8px; margin-bottom: 18px; }
    .pocos .seccion { display: flex; align-items: center; gap: 6px; margin-top: 4px; }
    .pocos .seccion ion-icon { color: var(--mc-barro); }
    .poco { display: flex; align-items: center; gap: 12px; width: 100%; padding: 10px 14px 10px 10px; border: 0; text-align: left;
      border-radius: var(--mc-radio); background: var(--mc-superficie); box-shadow: var(--mc-e1); font: inherit; color: inherit; cursor: pointer; }
    .poco .mini { width: 44px; height: 44px; flex-shrink: 0; border-radius: var(--mc-radio-chico); overflow: hidden; display: grid; place-items: center;
      background: var(--mc-suelo); color: var(--mc-arcilla); }
    .poco .mini img { width: 100%; height: 100%; object-fit: cover; }
    .poco .quien { flex: 1; min-width: 0; }
    .poco .quien small { color: var(--mc-barro); font-weight: 700; }
    .poco .accion { color: var(--mc-accion); font-weight: 700; font-size: 0.9rem; }
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
  ventas = signal<VentaDia[]>([]);
  /** Productos a la venta con 5 unidades o menos: avisar antes de que se agoten */
  pocos = computed(() => this.productos().filter((p) => p.activo && !p.oculto && p.stock > 0 && p.stock <= UMBRAL_POCOS)
    .sort((a, b) => a.stock - b.stock));

  pendientes = computed(() => this.pedidos().filter((p) => ['PENDIENTE', 'ACEPTADO', 'LISTO'].includes(p.estado)));
  activos = computed(() => this.productos().filter((p) => p.activo && p.stock > 0).length);
  agotados = computed(() => this.productos().filter((p) => p.activo && p.stock === 0).length);
  vendidoHoy = computed(() => {
    const hoy = new Date().toDateString();
    return this.pedidos().filter((p) => p.estado === 'ENTREGADO' && new Date(p.creadoEn).toDateString() === hoy)
      .reduce((s, p) => s + Number(p.total), 0);
  });

  constructor() {
    addIcons({ addCircleOutline, alertCircleOutline, warningOutline, leafOutline });
  }

  async ionViewWillEnter() {
    try {
      // Pendientes: todos los activos; entregado hoy sale de los 30 más recientes
      const [activos, recientes, pr] = await Promise.all([this.pedidosSrv.listar('activos'), this.pedidosSrv.listar(), this.productosSrv.listar()]);
      const pe = [...activos, ...recientes.filter((r) => !activos.some((a) => a.id === r.id))];
      this.pedidos.set(pe);
      this.productos.set(pr);
    } catch (e) {
      // Sin señal: se muestran los productos guardados y la franja avisa; no hace falta otro error
      if (!(e instanceof HttpErrorResponse && e.status === 0)) this.avisos.error(e);
      this.productosSrv.listar().then((pr) => this.productos.set(pr)).catch(() => undefined);
    }
    // El gráfico es secundario: si falla, el panel sigue sirviendo
    this.pedidosSrv.resumen().then((r) => this.ventas.set(r.dias)).catch(() => undefined);
  }

  nuevo() {
    this.nav.navigateForward('/productor/producto/nuevo');
  }
  editar(p: Producto) {
    this.nav.navigateForward(['/productor/producto', p.id, 'editar']);
  }
  abrir(p: Pedido) {
    this.nav.navigateForward(['/productor/pedido', p.id]);
  }
}
