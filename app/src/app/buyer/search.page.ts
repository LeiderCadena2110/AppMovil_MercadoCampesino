import { Component, OnInit, computed, inject, signal } from '@angular/core';
import {
  IonContent, IonHeader, IonToolbar, IonSearchbar, IonButton, IonIcon, IonModal, IonList, IonItem, IonSelect,
  IonSelectOption, IonFooter, IonInput, IonSegment, IonSegmentButton, IonLabel, IonInfiniteScroll,
  IonInfiniteScrollContent, InfiniteScrollCustomEvent,
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import { optionsOutline, closeCircle, searchOutline, cloudOfflineOutline } from 'ionicons/icons';
import { CatalogoService, OrdenCatalogo } from '../core/catalog.service';
import { AvisosService } from '../core/notifications.service';
import { Categoria, Municipio, ProductoLista } from '../core/models';
import { CatalogoListaComponent } from './catalog-list.component';
import { CatalogoCargandoComponent } from '../shared/catalog-skeleton.component';
import { EstadoVacioComponent } from '../shared/empty-state.component';
import { CopPipe } from '../shared/format';

/** Cantidad mínima que se considera "buena disponibilidad" */
const ABUNDANTE = 10;

interface Filtros {
  categoria: number | null; municipio: number | null;
  precioMin: number | null; precioMax: number | null;
  abundante: boolean; orden: OrdenCatalogo;
}
const SIN_FILTROS: Filtros = { categoria: null, municipio: null, precioMin: null, precioMax: null, abundante: false, orden: 'recientes' };

@Component({
  selector: 'app-buscar',
  imports: [IonContent, IonHeader, IonToolbar, IonSearchbar, IonButton, IonIcon, IonModal, IonList, IonItem, IonSelect,
    IonSelectOption, IonFooter, IonInput, IonSegment, IonSegmentButton, IonLabel, IonInfiniteScroll,
    IonInfiniteScrollContent, CatalogoListaComponent, CatalogoCargandoComponent, EstadoVacioComponent],
  template: `
    <ion-header class="ion-no-border">
      <ion-toolbar>
        <div class="cabecera">
          <h1>Buscar</h1>
          <div class="fila">
            <ion-searchbar class="mc-buscador" placeholder="Papa, mora, queso..." [debounce]="400" [value]="texto()"
              (ionInput)="buscar($event.detail.value ?? '')" />
            <button type="button" class="filtrar mc-tocable" (click)="abrirFiltros()" aria-label="Filtros">
              <ion-icon name="options-outline" />
              @if (activos().length) { <span class="cuenta">{{ activos().length }}</span> }
            </button>
          </div>
          @if (activos().length) {
            <div class="chips" aria-label="Filtros activos">
              @for (f of activos(); track f.clave) {
                <button type="button" class="chip" (click)="quitar(f.clave)" [attr.aria-label]="'Quitar filtro ' + f.texto">
                  {{ f.texto }} <ion-icon name="close-circle" />
                </button>
              }
            </div>
          }
        </div>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      @if (cargando() && productos().length === 0) {
        <app-catalogo-cargando />
      } @else if (fallo()) {
        <app-estado-vacio tipo="error" icono="cloud-offline-outline" titulo="No pudimos buscar"
          texto="Revisa tu conexión e inténtalo de nuevo.">
          <ion-button (click)="cargar(1)">Reintentar</ion-button>
        </app-estado-vacio>
      } @else if (productos().length === 0) {
        <app-estado-vacio icono="search-outline" [titulo]="texto() ? 'No encontramos “' + texto() + '”' : 'Ningún producto cumple esos filtros'"
          texto="Prueba con otra palabra, quita algún filtro o mira lo que sí hay hoy.">
          @if (activos().length) { <ion-button fill="outline" (click)="limpiar()">Quitar filtros</ion-button> }
        </app-estado-vacio>
        @if (recomendados().length) {
          <h2 class="seccion">Esto sí hay hoy</h2>
          <app-catalogo-lista [productos]="recomendados()" />
        }
      } @else {
        <p class="total">{{ total() }} {{ total() === 1 ? 'producto' : 'productos' }}</p>
        <app-catalogo-lista [productos]="productos()" />
      }
      <ion-infinite-scroll [disabled]="pagina() >= paginas()" (ionInfinite)="mas($event)">
        <ion-infinite-scroll-content loadingText="Cargando más..." />
      </ion-infinite-scroll>

      <ion-modal [isOpen]="filtrosAbiertos()" (didDismiss)="filtrosAbiertos.set(false)" [initialBreakpoint]="1" [breakpoints]="[0, 1]">
        <ng-template>
          <ion-content class="ion-padding">
            <h2 class="titulo-modal">Filtros</h2>
            <ion-list lines="full" class="caja">
              <ion-item>
                <ion-select label="Categoría" labelPlacement="stacked" interface="action-sheet" cancelText="Cancelar"
                  [value]="borrador().categoria" (ionChange)="cambiar('categoria', $event.detail.value)">
                  <ion-select-option [value]="null">Todas</ion-select-option>
                  @for (c of categorias(); track c.id) { <ion-select-option [value]="c.id">{{ c.nombre }}</ion-select-option> }
                </ion-select>
              </ion-item>
              <ion-item>
                <ion-select label="Municipio de origen" labelPlacement="stacked" interface="action-sheet" cancelText="Cancelar"
                  [value]="borrador().municipio" (ionChange)="cambiar('municipio', $event.detail.value)">
                  <ion-select-option [value]="null">Todos</ion-select-option>
                  @for (m of municipios(); track m.id) { <ion-select-option [value]="m.id">{{ m.nombre }}</ion-select-option> }
                </ion-select>
              </ion-item>
            </ion-list>

            <h3 class="sub">Precio (COP)</h3>
            <div class="precios">
              <ion-input label="Desde" labelPlacement="stacked" type="number" inputmode="numeric" min="0" fill="outline"
                [value]="borrador().precioMin" (ionInput)="cambiar('precioMin', numero($event.detail.value))" />
              <ion-input label="Hasta" labelPlacement="stacked" type="number" inputmode="numeric" min="0" fill="outline"
                [value]="borrador().precioMax" (ionInput)="cambiar('precioMax', numero($event.detail.value))" />
            </div>
            @if (errorPrecio()) { <p class="error">El precio "desde" no puede ser mayor que el "hasta".</p> }

            <h3 class="sub">Disponibilidad</h3>
            <ion-segment [value]="borrador().abundante ? 'si' : 'no'" (ionChange)="cambiar('abundante', $event.detail.value === 'si')">
              <ion-segment-button value="no"><ion-label>Cualquiera</ion-label></ion-segment-button>
              <ion-segment-button value="si"><ion-label>{{ abundante }} o más</ion-label></ion-segment-button>
            </ion-segment>

            <h3 class="sub">Ordenar por</h3>
            <ion-segment [value]="borrador().orden" (ionChange)="cambiar('orden', $any($event.detail.value))">
              <ion-segment-button value="recientes"><ion-label>Recientes</ion-label></ion-segment-button>
              <ion-segment-button value="precio_asc"><ion-label>Más barato</ion-label></ion-segment-button>
              <ion-segment-button value="precio_desc"><ion-label>Más caro</ion-label></ion-segment-button>
            </ion-segment>
          </ion-content>
          <ion-footer class="ion-padding pie">
            <ion-button fill="clear" (click)="borrador.set(sinFiltros)">Limpiar</ion-button>
            <ion-button expand="block" [disabled]="errorPrecio()" (click)="aplicar()">Ver resultados</ion-button>
          </ion-footer>
        </ng-template>
      </ion-modal>
    </ion-content>
  `,
  styles: `
    .cabecera { padding: 10px 16px 6px; }
    h1 { margin: 0 0 10px; font-size: 1.7rem; }
    .fila { display: flex; gap: 8px; align-items: center; }
    .fila ion-searchbar { flex: 1; }
    .filtrar { position: relative; width: 50px; height: 50px; flex-shrink: 0; border-radius: var(--mc-radio); cursor: pointer;
      border: 1px solid var(--mc-borde); background: var(--mc-superficie); color: var(--ion-text-color); font-size: 22px; display: grid; place-items: center; }
    .cuenta { position: absolute; top: -6px; right: -6px; min-width: 22px; height: 22px; padding: 0 5px; border-radius: 11px;
      background: var(--mc-destaque); color: var(--mc-destaque-texto); font-size: 12px; font-weight: 700; display: grid; place-items: center; }
    .chips { display: flex; gap: 8px; overflow-x: auto; padding-top: 10px; scrollbar-width: none; }
    .chip { flex-shrink: 0; display: inline-flex; align-items: center; gap: 4px; padding: 7px 10px 7px 12px; border-radius: 999px;
      border: 0; background: var(--mc-suelo); color: var(--mc-barro); font: inherit; font-weight: 700; font-size: 0.85rem; cursor: pointer; }
    .total { margin: 10px 16px 0; color: var(--mc-tinta-suave); font-size: 0.9rem; }
    .seccion { margin: 4px 16px 6px; font-size: 1.15rem; }
    .titulo-modal { margin: 4px 0 14px; }
    .caja { border: 1px solid var(--mc-borde); border-radius: var(--mc-radio); padding: 0; }
    .sub { font-size: 1rem; margin: 20px 0 8px; }
    .precios { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
    .error { color: var(--ion-color-danger); font-size: 0.88rem; margin: 6px 0 0; }
    .pie { display: flex; gap: 8px; align-items: center; background: var(--ion-background-color); }
    .pie ion-button[expand] { flex: 1; margin: 0; }
  `,
})
export class BuscarPage implements OnInit {
  private catalogo = inject(CatalogoService);
  private avisos = inject(AvisosService);
  private copFormato = new CopPipe();
  readonly abundante = ABUNDANTE;
  readonly sinFiltros = SIN_FILTROS;

  productos = signal<ProductoLista[]>([]);
  recomendados = signal<ProductoLista[]>([]);
  municipios = signal<Municipio[]>([]);
  categorias = signal<Categoria[]>([]);
  texto = signal('');
  filtros = signal<Filtros>(SIN_FILTROS);
  /** Copia que se edita en el modal; se aplica al tocar "Ver resultados" */
  borrador = signal<Filtros>(SIN_FILTROS);
  pagina = signal(1);
  paginas = signal(1);
  total = signal(0);
  cargando = signal(false);
  fallo = signal(false);
  filtrosAbiertos = signal(false);

  errorPrecio = computed(() => {
    const { precioMin, precioMax } = this.borrador();
    return precioMin != null && precioMax != null && precioMin > precioMax;
  });

  /** Filtros activos para mostrarlos como chips que se pueden quitar */
  activos = computed(() => {
    const f = this.filtros();
    const lista: { clave: keyof Filtros; texto: string }[] = [];
    if (f.categoria) lista.push({ clave: 'categoria', texto: this.categorias().find((c) => c.id === f.categoria)?.nombre ?? 'Categoría' });
    if (f.municipio) lista.push({ clave: 'municipio', texto: this.municipios().find((m) => m.id === f.municipio)?.nombre ?? 'Municipio' });
    if (f.precioMin != null) lista.push({ clave: 'precioMin', texto: `Desde ${this.copFormato.transform(f.precioMin)}` });
    if (f.precioMax != null) lista.push({ clave: 'precioMax', texto: `Hasta ${this.copFormato.transform(f.precioMax)}` });
    if (f.abundante) lista.push({ clave: 'abundante', texto: `${ABUNDANTE} o más disponibles` });
    if (f.orden !== 'recientes') lista.push({ clave: 'orden', texto: f.orden === 'precio_asc' ? 'Más barato primero' : 'Más caro primero' });
    return lista;
  });

  constructor() {
    addIcons({ optionsOutline, closeCircle, searchOutline, cloudOfflineOutline });
  }

  async ngOnInit() {
    // Se muestra el catálogo completo desde el principio: nada de pantalla vacía
    this.cargar(1);
    const [m, c] = await Promise.allSettled([this.catalogo.municipios(), this.catalogo.categorias()]);
    if (m.status === 'fulfilled') this.municipios.set(m.value);
    if (c.status === 'fulfilled') this.categorias.set(c.value);
  }

  numero(v: string | null | undefined) {
    const n = Number(v);
    return v === '' || v == null || Number.isNaN(n) || n < 0 ? null : n;
  }

  cambiar<K extends keyof Filtros>(clave: K, valor: Filtros[K]) {
    this.borrador.update((f) => ({ ...f, [clave]: valor }));
  }

  buscar(q: string) {
    this.texto.set(q.trim());
    this.cargar(1);
  }

  abrirFiltros() {
    this.borrador.set(this.filtros());
    this.filtrosAbiertos.set(true);
  }

  aplicar() {
    if (this.errorPrecio()) return;
    this.filtros.set(this.borrador());
    this.filtrosAbiertos.set(false);
    this.cargar(1);
  }

  quitar(clave: keyof Filtros) {
    this.filtros.update((f) => ({ ...f, [clave]: SIN_FILTROS[clave] }));
    this.cargar(1);
  }

  limpiar() {
    this.filtros.set(SIN_FILTROS);
    this.cargar(1);
  }

  async cargar(pagina: number) {
    const f = this.filtros();
    if (pagina === 1) this.cargando.set(true);
    this.fallo.set(false);
    try {
      const r = await this.catalogo.productos({
        q: this.texto(), categoria: f.categoria, municipio: f.municipio, precioMin: f.precioMin, precioMax: f.precioMax,
        stockMin: f.abundante ? ABUNDANTE : null, orden: f.orden, pagina,
      });
      this.productos.set(pagina === 1 ? r.items : [...this.productos(), ...r.items]);
      this.pagina.set(r.pagina);
      this.paginas.set(r.paginas);
      this.total.set(r.total);
      if (pagina === 1 && r.items.length === 0) this.cargarRecomendados();
    } catch (e) {
      if (pagina === 1) this.fallo.set(true);
      else this.avisos.error(e);
    } finally {
      this.cargando.set(false);
    }
  }

  /** Sin resultados: se sugieren productos reales disponibles hoy (de la misma categoría si había una) */
  private async cargarRecomendados() {
    try {
      const r = await this.catalogo.productos({ categoria: this.filtros().categoria, pagina: 1 });
      const items = r.items.length ? r.items : (await this.catalogo.productos({ pagina: 1 })).items;
      this.recomendados.set(items.slice(0, 4));
    } catch {
      this.recomendados.set([]);
    }
  }

  async mas(ev: InfiniteScrollCustomEvent) {
    await this.cargar(this.pagina() + 1);
    ev.target.complete();
  }
}
