import { Component, computed, inject, signal } from '@angular/core';
import {
  IonContent, IonHeader, IonToolbar, IonButton, IonIcon, IonFab, IonFabButton, IonRefresher, IonRefresherContent,
  IonSegment, IonSegmentButton, IonLabel, NavController, ViewWillEnter, RefresherCustomEvent,
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
  add, trashOutline, leafOutline, createOutline, pauseCircleOutline, playCircleOutline, cloudOfflineOutline, basketOutline,
} from 'ionicons/icons';
import { MisProductosService } from '../core/my-products.service';
import { AvisosService } from '../core/notifications.service';
import { Producto } from '../core/models';
import { CopPipe, UnidadPipe } from '../shared/format';
import { CatalogoCargandoComponent } from '../shared/catalog-skeleton.component';
import { EstadoVacioComponent } from '../shared/empty-state.component';

type Filtro = 'todos' | 'publicados' | 'borradores' | 'agotados';

/** Estado que ve el productor: publicado, borrador/pausado, agotado u oculto por el administrador */
function estadoDe(p: Producto) {
  if (p.oculto) return { texto: 'Oculto por revisión', clase: 'oculto' };
  if (!p.activo) return { texto: 'Borrador · no visible', clase: 'borrador' };
  if (p.stock === 0) return { texto: 'Agotado', clase: 'agotado' };
  return { texto: 'Publicado', clase: 'publicado' };
}

@Component({
  selector: 'app-mis-productos',
  imports: [IonContent, IonHeader, IonToolbar, IonButton, IonIcon, IonFab, IonFabButton, IonRefresher, IonRefresherContent,
    IonSegment, IonSegmentButton, IonLabel, CopPipe, UnidadPipe, CatalogoCargandoComponent, EstadoVacioComponent],
  template: `
    <ion-header class="ion-no-border"><ion-toolbar>
      <div class="cabecera">
        <h1>Mis productos</h1>
        @if (productos().length) {
          <ion-segment [value]="filtro()" (ionChange)="filtro.set($any($event.detail.value))" class="filtros">
            <ion-segment-button value="todos"><ion-label>Todos {{ productos().length }}</ion-label></ion-segment-button>
            <ion-segment-button value="publicados"><ion-label>Visibles {{ cuenta().publicados }}</ion-label></ion-segment-button>
            <ion-segment-button value="borradores"><ion-label>Borradores {{ cuenta().borradores }}</ion-label></ion-segment-button>
          </ion-segment>
        }
      </div>
    </ion-toolbar></ion-header>

    <ion-content>
      <ion-refresher slot="fixed" (ionRefresh)="refrescar($event)"><ion-refresher-content /></ion-refresher>

      @if (cargando() && !productos().length) {
        <app-catalogo-cargando [cantidad]="2" />
      } @else if (fallo() && !productos().length) {
        <app-estado-vacio tipo="error" icono="cloud-offline-outline" titulo="No pudimos cargar tus productos"
          texto="Revisa tu conexión e inténtalo de nuevo.">
          <ion-button (click)="cargar()">Reintentar</ion-button>
        </app-estado-vacio>
      } @else if (!productos().length) {
        <app-estado-vacio icono="basket-outline" titulo="Aún no publicas productos"
          texto="Toma una foto de tu cosecha, ponle precio y los compradores de Pasto la verán con el nombre de tu finca.">
          <ion-button (click)="nuevo()"><ion-icon slot="start" name="add" /> Publicar mi primer producto</ion-button>
        </app-estado-vacio>
      } @else {
        <div class="lista">
          @for (p of visibles(); track p.id) {
            <article class="producto" [class.apagado]="!p.activo || p.oculto">
              <button type="button" class="fila" (click)="editar(p)" [attr.aria-label]="'Editar ' + p.nombre">
                <span class="mini">
                  @if (p.miniaturaUrl) { <img [src]="p.miniaturaUrl" alt="" loading="lazy" /> } @else { <ion-icon name="leaf-outline" /> }
                </span>
                <span class="datos">
                  <strong>{{ p.nombre }}</strong>
                  <span>{{ p.precio | cop }} / {{ p.unidad }} · {{ p.stock }} {{ p.unidad | unidad: p.stock }}</span>
                  <span class="estado" [class]="estado(p).clase">{{ estado(p).texto }}</span>
                </span>
              </button>
              <div class="acciones">
                <button type="button" class="mc-tocable" (click)="editar(p)"><ion-icon name="create-outline" /> Editar</button>
                @if (!p.oculto) {
                  <button type="button" class="mc-tocable" [disabled]="ocupado() === p.id" (click)="alternar(p)">
                    <ion-icon [name]="p.activo ? 'pause-circle-outline' : 'play-circle-outline'" />
                    {{ p.activo ? 'Pausar' : 'Publicar' }}
                  </button>
                }
                <button type="button" class="mc-tocable peligro" [disabled]="ocupado() === p.id" (click)="eliminar(p)">
                  <ion-icon name="trash-outline" /> Eliminar
                </button>
              </div>
            </article>
          } @empty {
            <app-estado-vacio icono="leaf-outline" titulo="Nada en esta lista" texto="Cambia el filtro para ver tus otros productos." />
          }
        </div>
      }

      <ion-fab slot="fixed" vertical="bottom" horizontal="end">
        <ion-fab-button (click)="nuevo()" aria-label="Publicar producto nuevo"><ion-icon name="add" /></ion-fab-button>
      </ion-fab>
    </ion-content>
  `,
  styles: `
    .cabecera { padding: 10px 16px 8px; }
    h1 { margin: 0 0 10px; font-size: 1.7rem; }
    .filtros ion-segment-button { font-size: 0.85rem; }
    .lista { display: grid; gap: 12px; padding: 12px 16px 96px; }
    .producto { border: 1px solid var(--mc-borde); border-radius: var(--mc-radio); background: var(--mc-superficie); overflow: hidden; }
    .producto.apagado .mini, .producto.apagado .datos strong { opacity: 0.6; }
    .fila { display: flex; gap: 12px; width: 100%; padding: 12px; border: 0; background: none; text-align: left; font: inherit; color: inherit; cursor: pointer; }
    .mini { width: 72px; height: 72px; flex-shrink: 0; border-radius: var(--mc-radio-chico); overflow: hidden; display: grid; place-items: center;
      background: var(--mc-suelo); color: var(--mc-arcilla); font-size: 28px; }
    .mini img { width: 100%; height: 100%; object-fit: cover; }
    .datos { display: grid; gap: 3px; align-content: center; min-width: 0; }
    .datos strong { font-size: 1rem; }
    .datos span { font-size: 0.85rem; color: var(--mc-tinta-suave); }
    .estado { justify-self: start; padding: 2px 9px; border-radius: 999px; font-weight: 700; font-size: 0.78rem !important; }
    .estado.publicado { background: color-mix(in srgb, var(--ion-color-success) 15%, var(--mc-superficie)); color: var(--ion-color-success) !important; }
    .estado.borrador { background: var(--mc-suelo); color: var(--mc-barro) !important; }
    .estado.agotado { background: var(--mc-destaque); color: var(--mc-destaque-texto) !important; }
    .estado.oculto { background: color-mix(in srgb, var(--ion-color-danger) 12%, var(--mc-superficie)); color: var(--ion-color-danger) !important; }
    .acciones { display: flex; border-top: 1px solid var(--mc-borde); }
    .acciones button { flex: 1; display: inline-flex; align-items: center; justify-content: center; gap: 6px; min-height: 46px; border: 0;
      background: none; color: var(--mc-accion); font: inherit; font-weight: 700; font-size: 0.88rem; cursor: pointer; }
    .acciones button + button { border-left: 1px solid var(--mc-borde); }
    .acciones button.peligro { color: var(--ion-color-danger); }
    .acciones button:disabled { opacity: 0.4; }
  `,
})
export class MisProductosPage implements ViewWillEnter {
  private srv = inject(MisProductosService);
  private avisos = inject(AvisosService);
  private nav = inject(NavController);
  productos = signal<Producto[]>([]);
  filtro = signal<Filtro>('todos');
  cargando = signal(false);
  fallo = signal(false);
  /** id del producto que se está pausando/eliminando (evita doble toque) */
  ocupado = signal<number | null>(null);
  estado = estadoDe;

  cuenta = computed(() => ({
    publicados: this.productos().filter((p) => p.activo && !p.oculto).length,
    borradores: this.productos().filter((p) => !p.activo).length,
  }));
  visibles = computed(() => {
    const f = this.filtro();
    return this.productos().filter((p) =>
      f === 'todos' ? true : f === 'publicados' ? p.activo && !p.oculto : f === 'borradores' ? !p.activo : p.stock === 0);
  });

  constructor() {
    addIcons({ add, trashOutline, leafOutline, createOutline, pauseCircleOutline, playCircleOutline, cloudOfflineOutline, basketOutline });
  }

  ionViewWillEnter() {
    this.cargar();
  }

  async cargar() {
    this.cargando.set(true);
    this.fallo.set(false);
    try {
      this.productos.set(await this.srv.listar());
    } catch {
      this.fallo.set(true);
    } finally {
      this.cargando.set(false);
    }
  }

  async refrescar(ev: RefresherCustomEvent) {
    await this.cargar();
    ev.target.complete();
  }

  nuevo() {
    this.nav.navigateForward('/productor/producto/nuevo');
  }

  editar(p: Producto) {
    this.nav.navigateForward(['/productor/producto', p.id, 'editar']);
  }

  /** Pausar (deja de verse) o publicar (vuelve a verse) sin entrar al formulario */
  async alternar(p: Producto) {
    if (p.activo && !(await this.avisos.confirmar('Pausar producto', `"${p.nombre}" dejará de verse en el catálogo hasta que lo publiques de nuevo.`, 'Pausar'))) return;
    this.ocupado.set(p.id);
    try {
      await this.srv.actualizar(p.id, {
        nombre: p.nombre, categoriaId: p.categoriaId, precio: Number(p.precio), unidad: p.unidad, stock: p.stock,
        descripcion: p.descripcion ?? undefined, activo: !p.activo,
      });
      this.avisos.exito(p.activo ? 'Producto pausado' : 'Producto publicado');
      await this.cargar();
    } catch (e) {
      this.avisos.error(e);
    } finally {
      this.ocupado.set(null);
    }
  }

  async eliminar(p: Producto) {
    if (!(await this.avisos.confirmar('Eliminar producto', `¿Eliminar "${p.nombre}"? Esta acción no se puede deshacer.`, 'Eliminar'))) return;
    this.ocupado.set(p.id);
    try {
      const r = await this.srv.eliminar(p.id);
      this.avisos.exito(r.desactivado ? 'Tenía pedidos: quedó pausado para conservar el historial' : 'Producto eliminado');
      await this.cargar();
    } catch (e) {
      this.avisos.error(e);
    } finally {
      this.ocupado.set(null);
    }
  }
}
