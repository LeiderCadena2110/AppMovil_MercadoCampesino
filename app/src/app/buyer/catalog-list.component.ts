import { Component, inject, input } from '@angular/core';
import { IonGrid, IonRow, IonCol } from '@ionic/angular';
import { NavController } from '@ionic/angular';
import { ProductoCardComponent } from '../shared/product-card.component';
import { ProductoLista } from '../core/models';
import { CarritoService } from '../core/cart.service';
import { AvisosService } from '../core/notifications.service';

/** Cuadrícula de productos reutilizada en Inicio y Buscar */
@Component({
  selector: 'app-catalogo-lista',
  imports: [IonGrid, IonRow, IonCol, ProductoCardComponent],
  template: `
    <ion-grid class="ion-no-padding">
      <ion-row>
        @for (p of productos(); track p.id) {
          <ion-col size="6" size-md="4" size-lg="3">
            <app-producto-card [producto]="p" (abrir)="abrir($event)" (agregar)="agregar($event)" />
          </ion-col>
        }
      </ion-row>
    </ion-grid>
  `,
})
export class CatalogoListaComponent {
  productos = input.required<ProductoLista[]>();
  private nav = inject(NavController);
  private carrito = inject(CarritoService);
  private avisos = inject(AvisosService);

  abrir(p: ProductoLista) {
    this.nav.navigateForward(['/comprador/producto', p.id]);
  }
  agregar(p: ProductoLista) {
    this.carrito.agregar(p);
    this.avisos.exito(`${p.nombre} agregado al carrito`);
  }
}
