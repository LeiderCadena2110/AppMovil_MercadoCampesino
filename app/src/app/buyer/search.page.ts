import { Component, OnInit, inject, signal } from '@angular/core';
import {
  IonContent, IonHeader, IonToolbar, IonTitle, IonSearchbar, IonButtons, IonButton, IonIcon, IonModal, IonList,
  IonItem, IonSelect, IonSelectOption, IonFooter, IonInfiniteScroll, IonInfiniteScrollContent, InfiniteScrollCustomEvent,
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import { optionsOutline } from 'ionicons/icons';
import { CatalogoService } from '../core/catalog.service';
import { AvisosService } from '../core/notifications.service';
import { Categoria, Municipio, ProductoLista } from '../core/models';
import { CatalogoListaComponent } from './catalog-list.component';

@Component({
  selector: 'app-buscar',
  imports: [IonContent, IonHeader, IonToolbar, IonTitle, IonSearchbar, IonButtons, IonButton, IonIcon, IonModal, IonList,
    IonItem, IonSelect, IonSelectOption, IonFooter, IonInfiniteScroll, IonInfiniteScrollContent, CatalogoListaComponent],
  template: `
    <ion-header>
      <ion-toolbar color="primary">
        <ion-title>Buscar</ion-title>
        <ion-buttons slot="end">
          <ion-button (click)="filtrosAbiertos.set(true)" aria-label="Filtros"><ion-icon slot="icon-only" name="options-outline" /></ion-button>
        </ion-buttons>
      </ion-toolbar>
      <ion-toolbar>
        <ion-searchbar placeholder="Papa, mora, queso..." [debounce]="400" (ionInput)="buscar($event.detail.value ?? '')" />
      </ion-toolbar>
    </ion-header>
    <ion-content>
      @if (buscado() && productos().length === 0) { <p class="ion-text-center ion-padding">No encontramos productos con esa búsqueda.</p> }
      <app-catalogo-lista [productos]="productos()" />
      <ion-infinite-scroll [disabled]="pagina() >= paginas()" (ionInfinite)="mas($event)">
        <ion-infinite-scroll-content />
      </ion-infinite-scroll>

      <!-- Modal de filtros (patrón modal de la documentación) -->
      <ion-modal [isOpen]="filtrosAbiertos()" (didDismiss)="filtrosAbiertos.set(false)" [initialBreakpoint]="0.5" [breakpoints]="[0, 0.5, 0.8]">
        <ng-template>
          <ion-content class="ion-padding">
            <h2>Filtros</h2>
            <ion-list lines="full">
              <ion-item>
                <ion-select label="Municipio" interface="action-sheet" cancelText="Cancelar" [value]="municipio()" (ionChange)="municipio.set($event.detail.value)">
                  <ion-select-option [value]="null">Todos</ion-select-option>
                  @for (m of municipios(); track m.id) { <ion-select-option [value]="m.id">{{ m.nombre }}</ion-select-option> }
                </ion-select>
              </ion-item>
              <ion-item>
                <ion-select label="Categoría" interface="action-sheet" cancelText="Cancelar" [value]="categoria()" (ionChange)="categoria.set($event.detail.value)">
                  <ion-select-option [value]="null">Todas</ion-select-option>
                  @for (c of categorias(); track c.id) { <ion-select-option [value]="c.id">{{ c.nombre }}</ion-select-option> }
                </ion-select>
              </ion-item>
            </ion-list>
          </ion-content>
          <ion-footer class="ion-padding">
            <ion-button expand="block" (click)="aplicar()">Aplicar filtros</ion-button>
          </ion-footer>
        </ng-template>
      </ion-modal>
    </ion-content>
  `,
})
export class BuscarPage implements OnInit {
  private catalogo = inject(CatalogoService);
  private avisos = inject(AvisosService);
  productos = signal<ProductoLista[]>([]);
  municipios = signal<Municipio[]>([]);
  categorias = signal<Categoria[]>([]);
  texto = signal('');
  municipio = signal<number | null>(null);
  categoria = signal<number | null>(null);
  pagina = signal(1);
  paginas = signal(1);
  buscado = signal(false);
  filtrosAbiertos = signal(false);

  constructor() {
    addIcons({ optionsOutline });
  }

  async ngOnInit() {
    const [m, c] = await Promise.allSettled([this.catalogo.municipios(), this.catalogo.categorias()]);
    if (m.status === 'fulfilled') this.municipios.set(m.value);
    if (c.status === 'fulfilled') this.categorias.set(c.value);
  }

  buscar(q: string) {
    this.texto.set(q.trim());
    this.cargar(1);
  }

  aplicar() {
    this.filtrosAbiertos.set(false);
    this.cargar(1);
  }

  async cargar(pagina: number) {
    try {
      const r = await this.catalogo.productos({ q: this.texto(), municipio: this.municipio(), categoria: this.categoria(), pagina });
      this.productos.set(pagina === 1 ? r.items : [...this.productos(), ...r.items]);
      this.pagina.set(r.pagina);
      this.paginas.set(r.paginas);
      this.buscado.set(true);
    } catch (e) {
      this.avisos.error(e);
    }
  }

  async mas(ev: InfiniteScrollCustomEvent) {
    await this.cargar(this.pagina() + 1);
    ev.target.complete();
  }
}
