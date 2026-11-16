import { Component, computed, effect, inject, signal, untracked } from '@angular/core';
import {
  IonContent, IonHeader, IonToolbar, IonButton, IonIcon, IonFab, IonFabButton, IonRefresher, IonRefresherContent,
  IonSegment, IonSegmentButton, IonLabel, NavController, ViewWillEnter, RefresherCustomEvent,
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
  cloudUploadOutline, add, trashOutline, leafOutline, createOutline, pauseCircleOutline, playCircleOutline, cloudOfflineOutline, basketOutline,
} from 'ionicons/icons';
import { MisProductosService } from '../core/my-products.service';
import { SincronizacionService, Cambio } from '../core/sync.service';
import { EstadoSincronizacionComponent } from '../shared/sync-status.component';
import { AvisosService } from '../core/notifications.service';
import { Producto } from '../core/models';
import { CopPipe, UnidadPipe } from '../shared/format';
import { CatalogoCargandoComponent } from '../shared/catalog-skeleton.component';
import { EstadoVacioComponent } from '../shared/empty-state.component';

type Filtro = 'todos' | 'publicados' | 'borradores' | 'agotados';
/** Producto en la lista: puede tener cambios guardados en el teléfono aún sin enviar */
type Fila = Producto & { pendiente?: Cambio['tipo']; cambioId?: string; error?: string };

/** Estado que ve el productor: publicado, borrador/pausado, agotado u oculto por el administrador */
function estadoDe(p: Producto & { pendiente?: string }) {
  if (p.pendiente === 'crear') return p.activo ? { texto: 'Se publica al enviarse', clase: 'borrador' } : { texto: 'Borrador · en el teléfono', clase: 'borrador' };
  if (p.oculto) return { texto: 'Oculto por revisión', clase: 'oculto' };
  if (!p.activo) return { texto: 'Borrador · no visible', clase: 'borrador' };
  if (p.stock === 0) return { texto: 'Agotado', clase: 'agotado' };
  return { texto: 'Publicado', clase: 'publicado' };
}

@Component({
  selector: 'app-mis-productos',
  imports: [IonContent, IonHeader, IonToolbar, IonButton, IonIcon, IonFab, IonFabButton, IonRefresher, IonRefresherContent,
    IonSegment, IonSegmentButton, IonLabel, CopPipe, UnidadPipe, CatalogoCargandoComponent, EstadoVacioComponent, EstadoSincronizacionComponent],
  template: `
    <ion-header class="ion-no-border"><ion-toolbar>
      <div class="cabecera">
        <h1>Mis productos</h1>
        @if (filas().length) {
          <ion-segment [value]="filtro()" (ionChange)="filtro.set($any($event.detail.value))" class="filtros">
            <ion-segment-button value="todos"><ion-label>Todos {{ filas().length }}</ion-label></ion-segment-button>
            <ion-segment-button value="publicados"><ion-label>Visibles {{ cuenta().publicados }}</ion-label></ion-segment-button>
            <ion-segment-button value="borradores"><ion-label>Borradores {{ cuenta().borradores }}</ion-label></ion-segment-button>
          </ion-segment>
        }
      </div>
      <app-estado-sincronizacion />
    </ion-toolbar></ion-header>

    <ion-content>
      <ion-refresher slot="fixed" (ionRefresh)="refrescar($event)"><ion-refresher-content /></ion-refresher>

      @if (sinConexion() && productos().length) {
        <p class="viejo">Mostrando la última lista guardada en el teléfono.</p>
      }
      @if (cargando() && !filas().length) {
        <app-catalogo-cargando [cantidad]="2" />
      } @else if (fallo() && !filas().length) {
        <app-estado-vacio tipo="error" icono="cloud-offline-outline" titulo="No pudimos cargar tus productos"
          texto="Revisa tu conexión e inténtalo de nuevo.">
          <ion-button (click)="cargar()">Reintentar</ion-button>
        </app-estado-vacio>
      } @else if (!filas().length) {
        <app-estado-vacio icono="basket-outline" titulo="Aún no publicas productos"
          texto="Toma una foto de tu cosecha, ponle precio y los compradores de Pasto la verán con el nombre de tu finca.">
          <ion-button (click)="nuevo()"><ion-icon slot="start" name="add" /> Publicar mi primer producto</ion-button>
        </app-estado-vacio>
      } @else {
        <div class="lista">
          @for (p of visibles(); track p.cambioId ?? p.id) {
            <article class="producto" [class.apagado]="!p.activo || p.oculto" [class.con-error]="p.error">
              <button type="button" class="fila" (click)="editar(p)" [attr.aria-label]="'Editar ' + p.nombre">
                <span class="mini">
                  @if (p.miniaturaUrl) { <img [src]="p.miniaturaUrl" alt="" loading="lazy" /> } @else { <ion-icon name="leaf-outline" /> }
                </span>
                <span class="datos">
                  <strong>{{ p.nombre }}</strong>
                  <span>{{ p.precio | cop }} / {{ p.unidad }} · {{ p.stock }} {{ p.unidad | unidad: p.stock }}</span>
                  <span class="estado" [class]="estado(p).clase">{{ estado(p).texto }}</span>
                  @if (p.error) { <span class="cola error">No se pudo enviar: {{ p.error }}</span> }
                  @else if (p.pendiente) { <span class="cola"><ion-icon name="cloud-upload-outline" /> {{ p.pendiente === 'crear' ? 'Guardado en el teléfono · por enviar' : 'Cambios por enviar' }}</span> }
                </span>
              </button>
              <div class="acciones">
                @if (p.error) {
                  <button type="button" class="mc-tocable peligro" (click)="descartar(p)"><ion-icon name="trash-outline" /> Descartar cambio</button>
                }
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
    .producto { border: 0; box-shadow: var(--mc-e2); border-radius: var(--mc-radio); background: var(--mc-superficie); overflow: hidden; }
    .producto.apagado .mini, .producto.apagado .datos strong { opacity: 0.6; }
    .fila { display: flex; gap: 12px; width: 100%; padding: 12px; border: 0; background: none; text-align: left; font: inherit; color: inherit; cursor: pointer; }
    .mini { width: 72px; height: 72px; flex-shrink: 0; border-radius: var(--mc-radio-chico); overflow: hidden; display: grid; place-items: center;
      background: var(--mc-suelo); color: var(--mc-arcilla); font-size: 28px; }
    .mini img { width: 100%; height: 100%; object-fit: cover; }
    .datos { display: grid; gap: 3px; align-content: center; min-width: 0; }
    .datos strong { font-size: 1rem; }
    .datos span { font-size: 0.85rem; color: var(--mc-tinta-suave); }
    .estado { justify-self: start; padding: 2px 9px; border-radius: 999px; font-weight: 700; font-size: 0.78rem !important; }
    .estado.publicado { background: color-mix(in srgb, var(--ion-color-success) 15%, var(--mc-superficie)); color: color-mix(in srgb, var(--ion-color-success) 55%, var(--mc-tinta)) !important; }
    .estado.borrador { background: var(--mc-suelo); color: var(--mc-barro) !important; }
    .estado.agotado { background: var(--mc-destaque); color: var(--mc-destaque-texto) !important; }
    .estado.oculto { background: color-mix(in srgb, var(--ion-color-danger) 12%, var(--mc-superficie)); color: color-mix(in srgb, var(--ion-color-danger) 60%, var(--mc-tinta)) !important; }
    .viejo { margin: 10px 16px 0; font-size: 0.85rem; color: var(--mc-tinta-suave); }
    .cola { display: inline-flex; align-items: center; gap: 4px; font-size: 0.8rem !important; color: var(--mc-barro) !important; font-weight: 700; }
    .cola.error { color: color-mix(in srgb, var(--ion-color-danger) 60%, var(--mc-tinta)) !important; }
    .producto.con-error { box-shadow: 0 0 0 2px color-mix(in srgb, var(--ion-color-danger) 50%, transparent), var(--mc-e2); }
    .acciones { display: flex; border-top: 1px solid var(--mc-borde); }
    .acciones button { flex: 1; display: inline-flex; align-items: center; justify-content: center; gap: 6px; min-height: 46px; border: 0;
      background: none; color: var(--mc-accion); font: inherit; font-weight: 700; font-size: 0.88rem; cursor: pointer; }
    .acciones button + button { border-left: 1px solid var(--mc-borde); }
    .acciones button.peligro { color: color-mix(in srgb, var(--ion-color-danger) 60%, var(--mc-tinta)); }
    .acciones button:disabled { opacity: 0.4; }
  `,
})
export class MisProductosPage implements ViewWillEnter {
  private srv = inject(MisProductosService);
  private avisos = inject(AvisosService);
  private nav = inject(NavController);
  productos = signal<Producto[]>([]);
  private sync = inject(SincronizacionService);
  sinConexion = signal(false);
  private miniaturas = new Map<string, string>();
  /** Lista del servidor combinada con los cambios guardados en el teléfono */
  filas = computed<Fila[]>(() => {
    const cambios = this.sync.cambios();
    const nuevos: Fila[] = cambios.filter((c) => c.tipo === 'crear').map((c, i) => ({
      id: -(i + 1), productorId: 0, categoriaId: c.datos!.categoriaId, nombre: c.datos!.nombre, precio: String(c.datos!.precio),
      unidad: c.datos!.unidad, stock: c.datos!.stock, fotoUrl: null, miniaturaUrl: this.miniatura(c), activo: !!c.datos!.activo, oculto: false,
      descripcion: c.datos!.descripcion ?? null, pendiente: 'crear', cambioId: c.id, error: c.error,
    }));
    const existentes = this.productos().flatMap((p): Fila[] => {
      const c = cambios.find((x) => x.tipo !== 'crear' && x.productoId === p.id);
      if (c?.tipo === 'eliminar' && !c.error) return [];
      if (c?.tipo === 'actualizar') {
        return [{ ...p, ...c.datos!, precio: String(c.datos!.precio), activo: !!c.datos!.activo, descripcion: c.datos!.descripcion ?? null,
          miniaturaUrl: c.foto ? this.miniatura(c) : p.miniaturaUrl, pendiente: 'actualizar', cambioId: c.id, error: c.error }];
      }
      return [c ? { ...p, pendiente: c.tipo, cambioId: c.id, error: c.error } : p];
    });
    return [...nuevos, ...existentes];
  });
  filtro = signal<Filtro>('todos');
  cargando = signal(false);
  fallo = signal(false);
  /** id del producto que se está pausando/eliminando (evita doble toque) */
  ocupado = signal<number | null>(null);
  estado = estadoDe;

  cuenta = computed(() => ({
    publicados: this.filas().filter((p) => p.activo && !p.oculto).length,
    borradores: this.filas().filter((p) => !p.activo).length,
  }));
  visibles = computed(() => {
    const f = this.filtro();
    return this.filas().filter((p) =>
      f === 'todos' ? true : f === 'publicados' ? p.activo && !p.oculto : f === 'borradores' ? !p.activo : p.stock === 0);
  });

  constructor() {
    // Cuando la cola termina de enviar algo, se recarga la lista del servidor
    effect(() => { if (this.sync.version()) untracked(() => this.cargar()); });
    addIcons({ cloudUploadOutline, add, trashOutline, leafOutline, createOutline, pauseCircleOutline, playCircleOutline, cloudOfflineOutline, basketOutline });
  }

  ionViewWillEnter() {
    this.cargar();
  }

  async cargar() {
    this.cargando.set(true);
    this.fallo.set(false);
    try {
      const lista = await this.srv.listar();
      this.sinConexion.set(!!lista.sinConexion);
      this.productos.set(lista);
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

  editar(p: Fila) {
    if (p.pendiente === 'crear') this.nav.navigateForward('/productor/producto/nuevo', { queryParams: { pendiente: p.cambioId } });
    else this.nav.navigateForward(['/productor/producto', p.id, 'editar']);
  }

  private miniatura(c: Cambio) {
    if (!c.foto) return null;
    if (!this.miniaturas.has(c.id)) this.miniaturas.set(c.id, URL.createObjectURL(c.foto));
    return this.miniaturas.get(c.id)!;
  }

  async descartar(p: Fila) {
    if (!p.cambioId || !(await this.avisos.confirmar('Descartar cambio', `Se borra lo que guardaste en el teléfono para "${p.nombre}".`, 'Descartar'))) return;
    await this.sync.descartar(p.cambioId);
  }

  /** Sin señal (o producto aún no enviado): el cambio va a la cola del teléfono */
  private enTelefono(p: Fila) {
    return !this.sync.enLinea() || p.pendiente === 'crear';
  }

  private datosDe(p: Fila, activo: boolean) {
    return { nombre: p.nombre, categoriaId: p.categoriaId, precio: Number(p.precio), unidad: p.unidad, stock: p.stock,
      descripcion: p.descripcion ?? undefined, activo };
  }

  /** Pausar (deja de verse) o publicar (vuelve a verse) sin entrar al formulario */
  async alternar(p: Fila) {
    if (p.activo && !(await this.avisos.confirmar('Pausar producto', `"${p.nombre}" dejará de verse en el catálogo hasta que lo publiques de nuevo.`, 'Pausar'))) return;
    if (this.enTelefono(p)) {
      await this.sync.encolar(p.pendiente === 'crear'
        ? { id: p.cambioId!, tipo: 'crear', nombre: p.nombre, datos: this.datosDe(p, !p.activo) }
        : { id: crypto.randomUUID(), tipo: 'actualizar', productoId: p.id, nombre: p.nombre, datos: this.datosDe(p, !p.activo) });
      this.avisos.exito(this.sync.enLinea() ? 'Cambio guardado' : 'Sin señal: se aplicará cuando vuelva la conexión');
      return;
    }
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

  async eliminar(p: Fila) {
    if (!(await this.avisos.confirmar('Eliminar producto', `¿Eliminar "${p.nombre}"? Esta acción no se puede deshacer.`, 'Eliminar'))) return;
    if (p.pendiente === 'crear') {
      await this.sync.descartar(p.cambioId!);
      return;
    }
    if (!this.sync.enLinea()) {
      await this.sync.encolar({ id: crypto.randomUUID(), tipo: 'eliminar', productoId: p.id, nombre: p.nombre });
      this.avisos.exito('Sin señal: se eliminará cuando vuelva la conexión');
      return;
    }
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
