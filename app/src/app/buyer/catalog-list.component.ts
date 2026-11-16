import { Component, input } from '@angular/core';
import { IonGrid, IonRow, IonCol } from '@ionic/angular';
import { ProductoCardComponent } from '../shared/product-card.component';
import { ProductoLista } from '../core/models';

/** Cuadrícula de productos reutilizada en Inicio y Buscar */
@Component({
  selector: 'app-catalogo-lista',
  imports: [IonGrid, IonRow, IonCol, ProductoCardComponent],
  template: `
    <ion-grid class="rejilla">
      <ion-row>
        @for (p of productos(); track p.id) {
          <ion-col size="6" size-md="4" size-lg="3">
            <app-producto-card [producto]="p" />
          </ion-col>
        }
      </ion-row>
    </ion-grid>
  `,
  styles: `.rejilla { --ion-grid-padding: 6px; --ion-grid-column-padding: 0; }`,
})
export class CatalogoListaComponent {
  productos = input.required<ProductoLista[]>();
}
