import { Component, OnInit, inject, input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  IonContent, IonHeader, IonToolbar, IonTitle, IonButtons, IonBackButton, IonButton, IonIcon, IonImg, IonItem,
  IonLabel, IonList, IonFooter, IonBadge, IonSpinner,
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import { addOutline, removeOutline, leafOutline, storefrontOutline, checkmarkCircle } from 'ionicons/icons';
import { CatalogoService } from '../core/catalogo.service';
import { CarritoService } from '../core/carrito.service';
import { AvisosService } from '../core/avisos.service';
import { Producto } from '../core/models';
import { CopPipe } from '../shared/formato';

@Component({
  selector: 'app-producto-detalle',
  imports: [RouterLink, IonContent, IonHeader, IonToolbar, IonTitle, IonButtons, IonBackButton, IonButton, IonIcon, IonImg,
    IonItem, IonLabel, IonList, IonFooter, IonBadge, IonSpinner, CopPipe],
  template: `
    <ion-header><ion-toolbar color="primary">
      <ion-buttons slot="start"><ion-back-button defaultHref="/comprador/tabs/inicio" text="" /></ion-buttons>
      <ion-title>{{ producto()?.nombre ?? 'Producto' }}</ion-title>
    </ion-toolbar></ion-header>
    <ion-content>
      @if (producto(); as p) {
        <!-- La foto grande solo se descarga en el detalle (RNF-01) -->
        @if (p.fotoUrl) { <ion-img [src]="p.fotoUrl" [alt]="p.nombre" class="foto" /> }
        @else { <div class="foto sin-foto"><ion-icon name="leaf-outline" /></div> }
        <div class="ion-padding">
          <ion-badge color="light">{{ p.categoria?.nombre }}</ion-badge>
          <h1>{{ p.nombre }}</h1>
          <h2 class="precio">{{ p.precio | cop }} <small>por {{ p.unidad }}</small></h2>
          <p>Disponible: <strong>{{ p.stock }} {{ p.unidad }}</strong></p>
        </div>
        <ion-list lines="full" inset>
          <ion-item button [routerLink]="['/comprador/productor', p.productorId]" detail>
            <ion-icon slot="start" name="storefront-outline" color="primary" />
            <ion-label>
              <h3>{{ p.productor?.nombreFinca }}
                @if (p.productor?.verificado) { <ion-icon name="checkmark-circle" color="success" /> }
              </h3>
              <p>{{ p.productor?.usuario?.nombre }} · {{ p.productor?.municipio?.nombre }}</p>
            </ion-label>
          </ion-item>
        </ion-list>
      } @else {
        <div class="ion-text-center ion-padding"><ion-spinner /></div>
      }
    </ion-content>
    @if (producto(); as p) {
      <ion-footer class="ion-padding pie">
        <div class="cantidad">
          <ion-button fill="outline" (click)="cantidad.set(cantidad() - 1)" [disabled]="cantidad() <= 1" aria-label="Menos"><ion-icon slot="icon-only" name="remove-outline" /></ion-button>
          <strong>{{ cantidad() }}</strong>
          <ion-button fill="outline" (click)="cantidad.set(cantidad() + 1)" [disabled]="cantidad() >= p.stock" aria-label="Más"><ion-icon slot="icon-only" name="add-outline" /></ion-button>
        </div>
        <ion-button expand="block" size="large" (click)="agregar(p)">Agregar · {{ +p.precio * cantidad() | cop }}</ion-button>
      </ion-footer>
    }
  `,
  styles: `
    .foto { width: 100%; height: 260px; object-fit: cover; }
    .sin-foto { display: grid; place-items: center; background: var(--ion-color-light); font-size: 72px; color: var(--ion-color-primary); }
    h1 { margin: 8px 0 4px; font-weight: 700; }
    .precio { color: var(--ion-color-primary); margin: 0; }
    small { font-size: 14px; color: var(--ion-color-medium); }
    .pie { display: flex; gap: 12px; align-items: center; }
    .cantidad { display: flex; align-items: center; gap: 8px; }
    .pie > ion-button { flex: 1; }
  `,
})
export class ProductoDetallePage implements OnInit {
  id = input.required<string>(); // viene de la ruta /comprador/producto/:id
  private catalogo = inject(CatalogoService);
  private carrito = inject(CarritoService);
  private avisos = inject(AvisosService);
  producto = signal<Producto | null>(null);
  cantidad = signal(1);

  constructor() {
    addIcons({ addOutline, removeOutline, leafOutline, storefrontOutline, checkmarkCircle });
  }

  async ngOnInit() {
    try { this.producto.set(await this.catalogo.producto(+this.id())); } catch (e) { this.avisos.error(e); }
  }

  agregar(p: Producto) {
    this.carrito.agregar({
      id: p.id, nombre: p.nombre, precio: p.precio, unidad: p.unidad, stock: p.stock, fotoUrl: p.fotoUrl,
      miniaturaUrl: p.fotoUrl, productorId: p.productorId, finca: p.productor?.nombreFinca ?? '',
      municipio: p.productor?.municipio?.nombre ?? '', categoria: p.categoria?.nombre ?? '',
    }, this.cantidad());
    this.avisos.exito('Agregado al carrito');
  }
}
