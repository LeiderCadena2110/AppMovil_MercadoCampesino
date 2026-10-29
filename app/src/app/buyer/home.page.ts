import { Component, OnInit, effect, inject, signal } from '@angular/core';
import {
  IonContent, IonHeader, IonToolbar, IonIcon, IonInfiniteScroll, IonInfiniteScrollContent,
  IonRefresher, IonRefresherContent, IonSearchbar, IonButton, NavController,
  InfiniteScrollCustomEvent, RefresherCustomEvent,
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
  nutritionOutline, leafOutline, ellipseOutline, appsOutline, waterOutline, cafeOutline, flowerOutline,
  basketOutline, cloudOfflineOutline, sparkles,
} from 'ionicons/icons';
import { CatalogoService, aLista } from '../core/catalog.service';
import { FavoritosService } from '../core/favorites.service';
import { CopPipe } from '../shared/format';
import { AvisosService } from '../core/notifications.service';
import { AuthService } from '../core/auth.service';
import { Categoria, ProductoLista } from '../core/models';
import { CatalogoListaComponent } from './catalog-list.component';
import { CatalogoCargandoComponent } from '../shared/catalog-skeleton.component';
import { EstadoVacioComponent } from '../shared/empty-state.component';

@Component({
  selector: 'app-inicio',
  imports: [IonContent, IonHeader, IonToolbar, IonIcon, IonInfiniteScroll, IonInfiniteScrollContent,
    IonRefresher, IonRefresherContent, IonSearchbar, IonButton, CatalogoListaComponent, CatalogoCargandoComponent,
    EstadoVacioComponent, CopPipe],
  template: `
    <ion-header class="ion-no-border"><ion-toolbar>
      <div class="saludo">
        <p>{{ saludo }}, {{ nombre }}</p>
        <h1>¿Qué llevas hoy?</h1>
      </div>
    </ion-toolbar></ion-header>
    <ion-content>
      <ion-refresher slot="fixed" (ionRefresh)="refrescar($event)"><ion-refresher-content /></ion-refresher>

      <div class="cabecera">
        <ion-searchbar class="mc-buscador" placeholder="Papa, queso, café..." [debounce]="0"
          (click)="irABuscar()" (ionFocus)="irABuscar()" readonly />

        <button class="asistente" type="button" (click)="abrirAsistente()">
          <ion-icon name="sparkles" aria-hidden="true" />
          <span>
            <strong>Pregúntale a Campi</strong>
            <small>Te ayuda a armar el mercado o una receta con lo que hay hoy</small>
          </span>
        </button>
      </div>

      @if (sinConexion()) {
        <p class="aviso"><ion-icon name="cloud-offline-outline" /> Sin conexión: estás viendo los productos guardados.</p>
      }

      @if (favoritos().length) {
        <h2 class="seccion">Tus favoritos</h2>
        <div class="favoritos">
          @for (p of favoritos(); track p.id) {
            <button type="button" class="fav mc-tocable" (click)="abrir(p.id)">
              <span class="fav-foto">@if (p.miniaturaUrl) { <img [src]="p.miniaturaUrl" alt="" loading="lazy" /> } @else { <ion-icon name="leaf-outline" /> }</span>
              <strong>{{ p.nombre }}</strong>
              <small>{{ p.precio | cop }} / {{ p.unidad }}</small>
            </button>
          }
        </div>
      }

      <nav class="categorias" aria-label="Categorías">
        <button type="button" [class.activa]="categoria() === null" (click)="filtrar(null)">
          <span class="icono"><ion-icon name="basket-outline" /></span>Todo
        </button>
        @for (c of categorias(); track c.id) {
          <button type="button" [class.activa]="categoria() === c.id" (click)="filtrar(c.id)">
            <span class="icono"><ion-icon [name]="(c.icono ?? 'leaf') + '-outline'" /></span>{{ c.nombre }}
          </button>
        }
      </nav>

      <h2 class="seccion">{{ tituloSeccion() }}</h2>

      @if (cargando() && productos().length === 0) {
        <app-catalogo-cargando />
      } @else if (fallo() && productos().length === 0) {
        <app-estado-vacio tipo="error" icono="cloud-offline-outline" titulo="No pudimos cargar el catálogo"
          texto="Revisa tu conexión. Si el servidor estaba dormido, puede tardar hasta un minuto en responder.">
          <ion-button (click)="cargar(1)">Reintentar</ion-button>
        </app-estado-vacio>
      } @else if (productos().length === 0) {
        @if (categoria() !== null) {
          <app-estado-vacio icono="basket-outline" [titulo]="'Todavía no hay productos de ' + tituloSeccion().toLowerCase()"
            texto="Los productores publican a diario. Mira lo que hay en las otras categorías.">
            <ion-button fill="outline" (click)="filtrar(null)">Ver todos los productos</ion-button>
          </app-estado-vacio>
        } @else {
          <app-estado-vacio icono="leaf-outline" titulo="Aún no hay cosecha publicada"
            texto="Cuando los campesinos publiquen sus productos, aparecerán aquí con su precio y de dónde vienen.">
            <ion-button fill="outline" (click)="cargar(1)">Actualizar</ion-button>
          </app-estado-vacio>
        }
      }
      <app-catalogo-lista [productos]="productos()" />
      <ion-infinite-scroll [disabled]="pagina() >= paginas()" (ionInfinite)="masProductos($event)">
        <ion-infinite-scroll-content loadingText="Cargando más..." />
      </ion-infinite-scroll>
    </ion-content>
  `,
  styles: `
    .saludo { padding: 10px 16px 2px; }
    .saludo p { margin: 0; color: var(--mc-barro); font-size: 0.95rem; }
    .saludo h1 { margin: 2px 0 0; font-size: 1.7rem; }
    .cabecera { padding: 8px 16px 0; display: grid; gap: 12px; }
    .asistente {
      display: flex; gap: 12px; align-items: center; text-align: left; width: 100%;
      padding: 14px 16px; border-radius: var(--mc-radio); border: 0; cursor: pointer;
      background: var(--mc-marca); color: var(--mc-marca-texto); font: inherit;
    }
    .asistente ion-icon { font-size: 28px; color: var(--mc-destaque); flex-shrink: 0; }
    .asistente strong { display: block; font-family: var(--mc-titulos); font-size: 1.05rem; }
    .asistente small { display: block; color: var(--mc-marca-suave); font-size: 0.85rem; margin-top: 2px; }
    .aviso { margin: 12px 16px 0; font-size: 0.9rem; color: var(--mc-barro); display: flex; gap: 6px; align-items: center; }
    .categorias { display: flex; gap: 10px; overflow-x: auto; padding: 16px 16px 4px; scrollbar-width: none; }
    .categorias button {
      flex-shrink: 0; display: grid; justify-items: center; gap: 6px; width: 72px;
      background: none; border: 0; padding: 0; font: inherit; font-size: 0.8rem; font-weight: 700; color: var(--ion-text-color); cursor: pointer;
    }
    .icono {
      width: 58px; height: 58px; border-radius: 50%; display: grid; place-items: center;
      background: var(--mc-superficie); border: 1px solid var(--mc-borde); font-size: 26px; color: var(--ion-color-primary);
    }
    .categorias button.activa .icono { background: var(--mc-destaque); border-color: var(--mc-destaque); color: var(--mc-destaque-texto); }
    .seccion { margin: 18px 16px 6px; font-size: 1.15rem; }
    .favoritos { display: flex; gap: 10px; overflow-x: auto; padding: 4px 16px; scrollbar-width: none; }
    .fav { flex: 0 0 128px; display: grid; gap: 4px; padding: 8px; text-align: left; border-radius: var(--mc-radio); cursor: pointer;
      border: 1px solid var(--mc-borde); background: var(--mc-superficie); font: inherit; color: inherit; }
    .fav-foto { height: 76px; border-radius: var(--mc-radio-chico); overflow: hidden; display: grid; place-items: center;
      background: var(--mc-suelo); color: var(--mc-arcilla); font-size: 26px; }
    .fav-foto img { width: 100%; height: 100%; object-fit: cover; }
    .fav strong { font-size: 0.88rem; line-height: 1.2; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
    .fav small { color: var(--mc-tinta-suave); font-size: 0.78rem; }
  `,
})
export class InicioPage implements OnInit {
  private catalogo = inject(CatalogoService);
  private avisos = inject(AvisosService);
  private nav = inject(NavController);
  nombre = inject(AuthService).usuario()?.nombre.split(' ')[0] ?? 'vecino';
  saludo = (() => {
    const h = new Date().getHours();
    return h < 12 ? 'Buenos días' : h < 19 ? 'Buenas tardes' : 'Buenas noches';
  })();
  private favs = inject(FavoritosService);
  /** Favoritos con datos frescos de la API (precio y cantidad actuales) */
  favoritos = signal<ProductoLista[]>([]);
  categorias = signal<Categoria[]>([]);
  productos = signal<ProductoLista[]>([]);
  categoria = signal<number | null>(null);
  pagina = signal(1);
  paginas = signal(1);
  cargando = signal(false);
  fallo = signal(false);
  sinConexion = signal(false);

  constructor() {
    addIcons({ nutritionOutline, leafOutline, ellipseOutline, appsOutline, waterOutline, cafeOutline, flowerOutline,
      basketOutline, cloudOfflineOutline, sparkles });
  }

  private cargarFavoritos = effect(() => {
    const ids = this.favs.ids().slice(0, 10);
    Promise.all(ids.map((id) => this.catalogo.producto(id).then(aLista).catch(() => null))).then((lista) =>
      this.favoritos.set(lista.filter((p): p is ProductoLista => !!p && p.stock > 0)));
  });

  abrir(id: number) {
    this.nav.navigateForward(['/comprador/producto', id]);
  }

  tituloSeccion() {
    const c = this.categorias().find((x) => x.id === this.categoria());
    return c ? c.nombre : 'Recién cosechado';
  }

  async ngOnInit() {
    this.catalogo.categorias().then((c) => this.categorias.set(c)).catch(() => undefined);
    await this.cargar(1);
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
    await this.cargar(1);
    ev.target.complete();
  }
}
