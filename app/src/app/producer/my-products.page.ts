import { Component, inject, signal } from '@angular/core';
import {
  IonContent, IonHeader, IonToolbar, IonTitle, IonList, IonItem, IonLabel, IonThumbnail, IonImg, IonBadge, IonFab,
  IonFabButton, IonIcon, IonItemSliding, IonItemOptions, IonItemOption, IonNote, NavController, ViewWillEnter,
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import { add, trashOutline, leafOutline } from 'ionicons/icons';
import { MisProductosService } from '../core/my-products.service';
import { AvisosService } from '../core/notifications.service';
import { Producto } from '../core/models';
import { CopPipe } from '../shared/format';

@Component({
  selector: 'app-mis-productos',
  imports: [IonContent, IonHeader, IonToolbar, IonTitle, IonList, IonItem, IonLabel, IonThumbnail, IonImg, IonBadge, IonFab,
    IonFabButton, IonIcon, IonItemSliding, IonItemOptions, IonItemOption, IonNote, CopPipe],
  template: `
    <ion-header><ion-toolbar color="primary"><ion-title>Mis productos</ion-title></ion-toolbar></ion-header>
    <ion-content>
      <ion-list lines="full">
        @for (p of productos(); track p.id) {
          <ion-item-sliding>
            <ion-item button detail (click)="editar(p)">
              <ion-thumbnail slot="start">
                @if (p.miniaturaUrl) { <ion-img [src]="p.miniaturaUrl" alt="" /> } @else { <div class="sin-foto"><ion-icon name="leaf-outline" /></div> }
              </ion-thumbnail>
              <ion-label>
                <h3>{{ p.nombre }}</h3>
                <p>{{ p.precio | cop }} / {{ p.unidad }} · {{ p.categoria?.nombre }}</p>
                <ion-note>Stock: {{ p.stock }} {{ p.unidad }}</ion-note>
              </ion-label>
              @if (!p.activo) { <ion-badge slot="end" color="medium">Pausado</ion-badge> }
              @else if (p.oculto) { <ion-badge slot="end" color="danger">Oculto</ion-badge> }
              @else if (p.stock === 0) { <ion-badge slot="end" color="warning">Agotado</ion-badge> }
            </ion-item>
            <ion-item-options side="end">
              <ion-item-option color="danger" (click)="eliminar(p)"><ion-icon slot="icon-only" name="trash-outline" /></ion-item-option>
            </ion-item-options>
          </ion-item-sliding>
        } @empty {
          <p class="ion-text-center ion-padding">Aún no has publicado productos. Toca + para empezar.</p>
        }
      </ion-list>
      <ion-fab slot="fixed" vertical="bottom" horizontal="end">
        <ion-fab-button (click)="nuevo()" aria-label="Nuevo producto"><ion-icon name="add" /></ion-fab-button>
      </ion-fab>
    </ion-content>
  `,
  styles: `.sin-foto { display: grid; place-items: center; height: 100%; background: var(--ion-color-light); color: var(--ion-color-primary); font-size: 24px; }`,
})
export class MisProductosPage implements ViewWillEnter {
  private srv = inject(MisProductosService);
  private avisos = inject(AvisosService);
  private nav = inject(NavController);
  productos = signal<Producto[]>([]);

  constructor() {
    addIcons({ add, trashOutline, leafOutline });
  }

  async ionViewWillEnter() {
    try { this.productos.set(await this.srv.listar()); } catch (e) { this.avisos.error(e); }
  }

  nuevo() {
    this.nav.navigateForward('/productor/producto/nuevo');
  }
  editar(p: Producto) {
    this.nav.navigateForward(['/productor/producto', p.id, 'editar']);
  }

  async eliminar(p: Producto) {
    if (!(await this.avisos.confirmar('Eliminar producto', `¿Eliminar "${p.nombre}"?`, 'Eliminar'))) return;
    try {
      const r = await this.srv.eliminar(p.id);
      this.avisos.exito(r.desactivado ? 'Tenía pedidos: quedó pausado en vez de borrarse' : 'Producto eliminado');
      await this.ionViewWillEnter();
    } catch (e) {
      this.avisos.error(e);
    }
  }
}
