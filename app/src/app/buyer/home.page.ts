import { Component, OnInit, computed, effect, inject, signal } from '@angular/core';
import {
  IonContent, IonHeader, IonToolbar, IonIcon, IonInfiniteScroll, IonInfiniteScrollContent, IonRefresher,
  IonRefresherContent, IonButton, NavController, InfiniteScrollCustomEvent, RefresherCustomEvent,
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import { cloudOfflineOutline, sparkles, searchOutline, arrowForward } from 'ionicons/icons';
import { CatalogoService, aLista } from '../core/catalog.service';
import { FavoritosService } from '../core/favorites.service';
import { AvisosService } from '../core/notifications.service';
import { AuthService } from '../core/auth.service';
import { Categoria, ProductoLista } from '../core/models';
import { CopPipe } from '../shared/format';
import { CatalogoListaComponent } from './catalog-list.component';
import { CatalogoCargandoComponent } from '../shared/catalog-skeleton.component';
import { EstadoVacioComponent } from '../shared/empty-state.component';
import { IconoCategoriaComponent } from '../shared/category-icon.component';
import { ProductoCardComponent } from '../shared/product-card.component';

/**
 * Inicio "Tierra viva":
 *  - portada deslizable: Campi + "Cosecha de la semana" (productos reales con foto)
 *  - categorías con íconos propios
 *  - carriles horizontales con datos reales: favoritos, recién cosechado, fincas verificadas, más económicos
 *  - todo el catálogo en cuadrícula con carga infinita
 * Al elegir una categoría se muestra solo la cuadrícula de esa categoría.
 */
@Component({
  selector: 'app-inicio',
  imports: [IonContent, IonHeader, IonToolbar, IonIcon, IonInfiniteScroll, IonInfiniteScrollContent, IonRefresher,
    IonRefresherContent, IonButton, CopPipe, CatalogoListaComponent, CatalogoCargandoComponent, EstadoVacioComponent,
    IconoCategoriaComponent, ProductoCardComponent],
  template: `
    <ion-header class="ion-no-border"><ion-toolbar>
      <div class="saludo">
        <p>{{ saludo }}, {{ nombre }}</p>
        <h1>¿Qué llevas hoy?</h1>
      </div>
    </ion-toolbar></ion-header>

    <ion-content>
      <ion-refresher slot="fixed" (ionRefresh)="refrescar($event)"><ion-refresher-content /></ion-refresher>

      <!-- Buscador fijo arriba al hacer scroll -->
      <div class="buscador-fijo">
        <button type="button" class="buscador mc-tocable" (click)="irABuscar()">
          <ion-icon name="search-outline" aria-hidden="true" /> <span>Papa, queso, café…</span>
        </button>
      </div>

      @if (sinConexion()) {
        <p class="aviso"><ion-icon name="cloud-offline-outline" /> Sin conexión: estás viendo los productos guardados.</p>
      }

      @if (categoria() === null) {
        <!-- Portada deslizable -->
        <section class="portada" aria-label="Destacados">
          <button type="button" class="diapositiva campi mc-tocable" (click)="abrirAsistente()">
            <img src="img/galeras-campo-720.webp" alt="" class="fondo-campi" />
            <span class="velo"></span>
            <span class="contenido">
              <span class="etiqueta"><ion-icon name="sparkles" /> Asistente</span>
              <strong>Pregúntale a Campi</strong>
              <small>Arma tu mercado o una receta con lo que hay hoy</small>
            </span>
          </button>
          @for (p of destacados(); track p.id) {
            <button type="button" class="diapositiva mc-tocable" (click)="abrir(p.id)" [attr.aria-label]="'Ver ' + p.nombre">
              <img [src]="p.miniaturaUrl" alt="" loading="lazy" />
              <span class="velo"></span>
              <span class="contenido">
                <span class="etiqueta">Cosecha de la semana</span>
                <strong>{{ p.nombre }}</strong>
                <small>{{ p.finca }} · {{ p.municipio }}</small>
                <span class="precio mc-num">{{ p.precio | cop }} <small>/ {{ p.unidad }}</small></span>
              </span>
            </button>
          }
        </section>
      }

      <nav class="categorias" aria-label="Categorías">
        <button type="button" [class.activa]="categoria() === null" (click)="filtrar(null)" [attr.aria-pressed]="categoria() === null">
          <span class="icono"><app-icono-categoria nombre="todo" [tamano]="30" /></span>Todo
        </button>
        @for (c of categorias(); track c.id) {
          <button type="button" [class.activa]="categoria() === c.id" (click)="filtrar(c.id)" [attr.aria-pressed]="categoria() === c.id">
            <span class="icono"><app-icono-categoria [nombre]="c.nombre" [tamano]="30" /></span>{{ c.nombre }}
          </button>
        }
      </nav>

      @if (cargando() && productos().length === 0) {
        <app-catalogo-cargando />
      } @else if (fallo() && productos().length === 0) {
        <app-estado-vacio tipo="error" titulo="No pudimos cargar el catálogo"
          texto="Revisa tu conexión. Si el servidor estaba dormido, puede tardar hasta un minuto en responder.">
          <ion-button (click)="cargar(1)">Reintentar</ion-button>
        </app-estado-vacio>
      } @else if (productos().length === 0) {
        @if (categoria() !== null) {
          <app-estado-vacio icono="basket-outline" [titulo]="'Todavía no hay productos de ' + tituloCategoria().toLowerCase()"
            texto="Los productores publican a diario. Mira lo que hay en las otras categorías.">
            <ion-button fill="outline" (click)="filtrar(null)">Ver todos los productos</ion-button>
          </app-estado-vacio>
        } @else {
          <app-estado-vacio icono="leaf-outline" titulo="Aún no hay cosecha publicada"
            texto="Cuando los campesinos publiquen sus productos, aparecerán aquí con su precio y de dónde vienen.">
            <ion-button fill="outline" (click)="cargar(1)">Actualizar</ion-button>
          </app-estado-vacio>
        }
      } @else {
        @if (categoria() === null) {
          <!-- Carriles con datos reales -->
          @for (carril of carriles(); track carril.titulo) {
            @if (carril.items.length) {
              <section class="carril">
                <h2>{{ carril.titulo }}</h2>
                <div class="pista">
                  @for (p of carril.items; track p.id) {
                    <div class="celda"><app-producto-card [producto]="p" (abrir)="abrir($event.id)" /></div>
                  }
                </div>
              </section>
            }
          }
          <h2 class="seccion">Todo el catálogo</h2>
        } @else {
          <h2 class="seccion">{{ tituloCategoria() }}</h2>
        }
        <app-catalogo-lista [productos]="productos()" />
      }

      <ion-infinite-scroll [disabled]="pagina() >= paginas()" (ionInfinite)="masProductos($event)">
        <ion-infinite-scroll-content loadingText="Cargando más..." />
      </ion-infinite-scroll>
    </ion-content>
  `,
  styles: `
    .saludo { padding: 10px 16px 2px; }
    .saludo p { margin: 0; color: var(--mc-barro); font-size: 0.95rem; }
    .saludo h1 { margin: 2px 0 0; font-size: 1.75rem; }

    .buscador-fijo { position: sticky; top: 0; z-index: 5; padding: 8px 16px 10px; background: var(--ion-background-color); }
    .buscador { display: flex; align-items: center; gap: 10px; width: 100%; height: 50px; padding: 0 16px; border: 0; cursor: text;
      border-radius: 999px; background: var(--mc-superficie); box-shadow: var(--mc-e1); color: var(--mc-tinta-suave); font: inherit; font-size: 1rem; }
    .buscador ion-icon { font-size: 20px; color: var(--ion-text-color); }
    .aviso { margin: 0 16px 8px; font-size: 0.9rem; color: var(--mc-barro); display: flex; gap: 6px; align-items: center; }

    /* Portada deslizable con imán (scroll-snap) */
    .portada { display: flex; gap: 12px; overflow-x: auto; scroll-snap-type: x mandatory; padding: 4px 16px 10px; scrollbar-width: none; }
    .portada::-webkit-scrollbar { display: none; }
    .diapositiva { position: relative; flex: 0 0 86%; max-width: 420px; height: 176px; overflow: hidden; scroll-snap-align: start; padding: 0;
      border: 0; border-radius: var(--mc-radio-grande); box-shadow: var(--mc-e3); text-align: left; cursor: pointer; color: #fff;
      background: var(--mc-marca); font: inherit; }
    .diapositiva img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; }
    .diapositiva img.fondo-campi { object-position: 80% 45%; }
    .velo { position: absolute; inset: 0; background: linear-gradient(180deg, rgb(16 40 22 / 0.05) 20%, rgb(16 40 22 / 0.82) 100%); }
    .contenido { position: absolute; inset: auto 0 0 0; display: grid; gap: 2px; padding: 16px 18px; }
    .contenido strong { font-family: var(--mc-titulos); font-size: 1.35rem; line-height: 1.1; }
    .contenido > small { color: #dfe9df; font-size: 0.85rem; }
    .etiqueta { justify-self: start; display: inline-flex; align-items: center; gap: 4px; margin-bottom: 4px; padding: 3px 10px;
      border-radius: 999px; background: var(--mc-destaque); color: var(--mc-destaque-texto); font-size: 0.75rem; font-weight: 700; }
    .contenido .precio { margin-top: 4px; font-size: 1.05rem; font-weight: 800; }
    .contenido .precio small { font-family: var(--ion-font-family); font-weight: 400; color: #dfe9df; }

    .categorias { display: flex; gap: 10px; overflow-x: auto; padding: 10px 16px 4px; scrollbar-width: none; }
    .categorias button {
      flex-shrink: 0; display: grid; justify-items: center; gap: 6px; width: 74px;
      background: none; border: 0; padding: 0; font: inherit; font-size: 0.8rem; font-weight: 700; color: var(--ion-text-color); cursor: pointer;
    }
    .icono { width: 60px; height: 60px; border-radius: 50%; display: grid; place-items: center; background: var(--mc-superficie);
      box-shadow: var(--mc-e1); color: var(--mc-accion); transition: transform 160ms var(--mc-curva), background 160ms; }
    .categorias button:active .icono { transform: scale(0.92); }
    .categorias button.activa .icono { background: var(--mc-destaque); color: var(--mc-destaque-texto); box-shadow: var(--mc-e2); }

    .carril h2, .seccion { margin: 18px 16px 4px; font-size: 1.2rem; }
    .pista { display: flex; overflow-x: auto; scroll-snap-type: x proximity; padding: 0 10px; scrollbar-width: none; }
    .pista::-webkit-scrollbar { display: none; }
    .celda { flex: 0 0 172px; scroll-snap-align: start; }
  `,
})
export class InicioPage implements OnInit {
  private catalogo = inject(CatalogoService);
  private avisos = inject(AvisosService);
  private nav = inject(NavController);
  private favs = inject(FavoritosService);
  nombre = inject(AuthService).usuario()?.nombre.split(' ')[0] ?? 'vecino';
  saludo = (() => {
    const h = new Date().getHours();
    return h < 12 ? 'Buenos días' : h < 19 ? 'Buenas tardes' : 'Buenas noches';
  })();

  categorias = signal<Categoria[]>([]);
  productos = signal<ProductoLista[]>([]);
  /** Favoritos con datos frescos de la API (precio y cantidad actuales) */
  favoritos = signal<ProductoLista[]>([]);
  economicos = signal<ProductoLista[]>([]);
  categoria = signal<number | null>(null);
  pagina = signal(1);
  paginas = signal(1);
  cargando = signal(false);
  fallo = signal(false);
  sinConexion = signal(false);

  /** Portada: hasta 5 productos recientes que tienen foto */
  destacados = computed(() => this.productos().filter((p) => p.miniaturaUrl).slice(0, 5));

  /** Carriles horizontales, todos con datos reales del catálogo */
  carriles = computed(() => [
    { titulo: 'Tus favoritos', items: this.favoritos() },
    { titulo: 'Recién cosechado', items: this.productos().slice(0, 8) },
    { titulo: 'De fincas verificadas', items: this.productos().filter((p) => p.verificado).slice(0, 8) },
    { titulo: 'Los más económicos', items: this.economicos() },
  ]);

  constructor() {
    addIcons({ cloudOfflineOutline, sparkles, searchOutline, arrowForward });
  }

  private cargarFavoritos = effect(() => {
    const ids = this.favs.ids().slice(0, 10);
    Promise.all(ids.map((id) => this.catalogo.producto(id).then(aLista).catch(() => null))).then((lista) =>
      this.favoritos.set(lista.filter((p): p is ProductoLista => !!p && p.stock > 0)));
  });

  tituloCategoria() {
    return this.categorias().find((x) => x.id === this.categoria())?.nombre ?? 'Todo';
  }

  async ngOnInit() {
    this.catalogo.categorias().then((c) => this.categorias.set(c)).catch(() => undefined);
    await Promise.all([this.cargar(1), this.cargarEconomicos()]);
  }

  abrir(id: number) {
    this.nav.navigateForward(['/comprador/producto', id]);
  }

  irABuscar() {
    this.nav.navigateRoot('/comprador/tabs/buscar');
  }

  abrirAsistente() {
    this.nav.navigateForward('/comprador/asistente');
  }

  filtrar(id: number | null) {
    this.categoria.set(id);
    this.productos.set([]);
    this.cargar(1);
  }

  private async cargarEconomicos() {
    try {
      this.economicos.set((await this.catalogo.productos({ orden: 'precio_asc', pagina: 1 })).items.slice(0, 8));
    } catch {
      this.economicos.set([]);
    }
  }

  async cargar(pagina: number) {
    this.cargando.set(true);
    this.fallo.set(false);
    try {
      const r = await this.catalogo.productos({ categoria: this.categoria(), pagina });
      this.sinConexion.set(!!r.sinConexion);
      this.productos.set(pagina === 1 ? r.items : [...this.productos(), ...r.items]);
      this.pagina.set(r.pagina);
      this.paginas.set(r.paginas);
    } catch (e) {
      this.fallo.set(true);
      if (pagina > 1) this.avisos.error(e);
    } finally {
      this.cargando.set(false);
    }
  }

  async masProductos(ev: InfiniteScrollCustomEvent) {
    await this.cargar(this.pagina() + 1);
    ev.target.complete();
  }

  async refrescar(ev: RefresherCustomEvent) {
    await Promise.all([this.cargar(1), this.cargarEconomicos()]);
    ev.target.complete();
  }
}
