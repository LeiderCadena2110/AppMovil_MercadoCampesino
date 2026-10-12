import { Component, OnInit, computed, inject, input, signal } from '@angular/core';
import {
  IonContent, IonHeader, IonToolbar, IonTitle, IonButtons, IonBackButton, IonIcon, IonButton, IonSpinner,
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import { checkmarkCircle, callOutline, locationOutline } from 'ionicons/icons';
import { CatalogoService } from '../core/catalogo.service';
import { AvisosService } from '../core/avisos.service';
import { ProductoLista, Productor } from '../core/models';
import { CatalogoListaComponent } from './catalogo-lista.component';

@Component({
  selector: 'app-productor-perfil',
  imports: [IonContent, IonHeader, IonToolbar, IonTitle, IonButtons, IonBackButton, IonIcon, IonButton, IonSpinner, CatalogoListaComponent],
  template: `
    <ion-header><ion-toolbar color="primary">
      <ion-buttons slot="start"><ion-back-button defaultHref="/comprador/tabs/inicio" text="" /></ion-buttons>
      <ion-title>Productor</ion-title>
    </ion-toolbar></ion-header>
    <ion-content>
      @if (productor(); as p) {
        <div class="ion-padding">
          <h1>{{ p.nombreFinca }} @if (p.verificado) { <ion-icon name="checkmark-circle" color="success" /> }</h1>
          <p><ion-icon name="location-outline" /> {{ p.municipio?.nombre }}, {{ p.municipio?.departamento }}</p>
          <p>{{ p.usuario?.nombre }}</p>
          @if (p.descripcion) { <p>{{ p.descripcion }}</p> }
          @if (p.usuario?.telefono) {
            <ion-button fill="outline" [href]="'tel:' + p.usuario?.telefono"><ion-icon slot="start" name="call-outline" /> Llamar</ion-button>
          }
          <h2>Productos</h2>
        </div>
        <app-catalogo-lista [productos]="productos()" />
      } @else {
        <div class="ion-text-center ion-padding"><ion-spinner /></div>
      }
    </ion-content>
  `,
})
export class ProductorPerfilPage implements OnInit {
  id = input.required<string>();
  private catalogo = inject(CatalogoService);
  private avisos = inject(AvisosService);
  productor = signal<Productor | null>(null);

  productos = computed<ProductoLista[]>(() => {
    const p = this.productor();
    return (p?.productos ?? []).filter((x) => x.stock > 0).map((x) => ({
      id: x.id, nombre: x.nombre, precio: x.precio, unidad: x.unidad, stock: x.stock, fotoUrl: x.fotoUrl,
      miniaturaUrl: x.miniaturaUrl ?? null, productorId: p!.id, finca: p!.nombreFinca,
      municipio: p!.municipio?.nombre ?? '', categoria: '',
    }));
  });

  constructor() {
    addIcons({ checkmarkCircle, callOutline, locationOutline });
  }

  async ngOnInit() {
    try { this.productor.set(await this.catalogo.productor(+this.id())); } catch (e) { this.avisos.error(e); }
  }
}
