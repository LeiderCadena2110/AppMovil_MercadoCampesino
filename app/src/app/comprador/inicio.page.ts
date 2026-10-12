import { Component, OnInit, inject, signal } from '@angular/core';
import {
  IonContent, IonHeader, IonToolbar, IonTitle, IonChip, IonLabel, IonInfiniteScroll, IonInfiniteScrollContent,
  IonRefresher, IonRefresherContent, IonText, IonSpinner, InfiniteScrollCustomEvent, RefresherCustomEvent,
} from '@ionic/angular';
import { CatalogoService } from '../core/catalogo.service';
import { AvisosService } from '../core/avisos.service';
import { Categoria, ProductoLista } from '../core/models';
import { CatalogoListaComponent } from './catalogo-lista.component';

@Component({
  selector: 'app-inicio',
  imports: [IonContent, IonHeader, IonToolbar, IonTitle, IonChip, IonLabel, IonInfiniteScroll, IonInfiniteScrollContent,
    IonRefresher, IonRefresherContent, IonText, IonSpinner, CatalogoListaComponent],
  template: `
    <ion-header><ion-toolbar color="primary"><ion-title>Mercado Campesino</ion-title></ion-toolbar></ion-header>
    <ion-content>
      <ion-refresher slot="fixed" (ionRefresh)="refrescar($event)"><ion-refresher-content /></ion-refresher>
      @if (sinConexion()) {
        <ion-text color="warning"><p class="aviso">Sin conexión: estás viendo los productos guardados.</p></ion-text>
      }
      <div class="chips">
        <ion-chip [outline]="categoria() !== null" (click)="filtrar(null)"><ion-label>Todo</ion-label></ion-chip>
        @for (c of categorias(); track c.id) {
          <ion-chip [outline]="categoria() !== c.id" (click)="filtrar(c.id)"><ion-label>{{ c.nombre }}</ion-label></ion-chip>
        }
      </div>
      @if (cargando() && productos().length === 0) {
        <div class="ion-text-center ion-padding"><ion-spinner /></div>
      } @else if (productos().length === 0) {
        <p class="ion-text-center ion-padding">No hay productos en esta categoría todavía.</p>
      }
      <app-catalogo-lista [productos]="productos()" />
      <ion-infinite-scroll [disabled]="pagina() >= paginas()" (ionInfinite)="masProductos($event)">
        <ion-infinite-scroll-content loadingText="Cargando más..." />
      </ion-infinite-scroll>
    </ion-content>
  `,
  styles: `
    .chips { display: flex; overflow-x: auto; padding: 8px 6px 0; white-space: nowrap; }
    .chips ion-chip { flex-shrink: 0; }
    .aviso { margin: 8px 12px 0; font-size: 14px; }
  `,
})
export class InicioPage implements OnInit {
  private catalogo = inject(CatalogoService);
  private avisos = inject(AvisosService);
  categorias = signal<Categoria[]>([]);
  productos = signal<ProductoLista[]>([]);
  categoria = signal<number | null>(null);
  pagina = signal(1);
  paginas = signal(1);
  cargando = signal(false);
  sinConexion = signal(false);

  async ngOnInit() {
    this.catalogo.categorias().then((c) => this.categorias.set(c)).catch(() => undefined);
    await this.cargar(1);
  }

  filtrar(id: number | null) {
    this.categoria.set(id);
    this.productos.set([]);
    this.cargar(1);
  }

  async cargar(pagina: number) {
    this.cargando.set(true);
    try {
      const r = await this.catalogo.productos({ categoria: this.categoria(), pagina });
      this.sinConexion.set(!!r.sinConexion);
      this.productos.set(pagina === 1 ? r.items : [...this.productos(), ...r.items]);
      this.pagina.set(r.pagina);
      this.paginas.set(r.paginas);
    } catch (e) {
      this.avisos.error(e);
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
