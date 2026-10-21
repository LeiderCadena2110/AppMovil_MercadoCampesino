import { Component, OnInit, inject, signal } from '@angular/core';
import {
  IonContent, IonHeader, IonToolbar, IonTitle, IonButtons, IonButton, IonList, IonItem, IonLabel, IonSegment,
  IonSegmentButton, IonInput, IonIcon,
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import { logOutOutline } from 'ionicons/icons';
import { AdminService } from '../core/admin.service';
import { AuthService } from '../core/auth.service';
import { AvisosService } from '../core/notifications.service';
import { Productor } from '../core/models';

/** Panel web del administrador (/admin): validar productores y ocultar productos */
@Component({
  selector: 'app-admin',
  imports: [IonContent, IonHeader, IonToolbar, IonTitle, IonButtons, IonButton, IonList, IonItem, IonLabel, IonSegment,
    IonSegmentButton, IonInput, IonIcon],
  template: `
    <ion-header>
      <ion-toolbar color="dark">
        <ion-title>Administración</ion-title>
        <ion-buttons slot="end"><ion-button (click)="auth.salir()"><ion-icon slot="start" name="log-out-outline" />Salir</ion-button></ion-buttons>
      </ion-toolbar>
      <ion-toolbar>
        <ion-segment [value]="vista()" (ionChange)="cambiarVista($any($event.detail.value))">
          <ion-segment-button value="pendientes">Por verificar</ion-segment-button>
          <ion-segment-button value="verificados">Verificados</ion-segment-button>
        </ion-segment>
      </ion-toolbar>
    </ion-header>
    <ion-content class="ion-padding">
      <ion-list lines="full">
        @for (p of productores(); track p.id) {
          <ion-item>
            <ion-label>
              <h3>{{ p.nombreFinca }} · {{ p.municipio?.nombre }}</h3>
              <p>{{ p.usuario?.nombre }} · {{ p.usuario?.email }} · {{ p.usuario?.telefono }}</p>
            </ion-label>
            <ion-button slot="end" [color]="p.verificado ? 'medium' : 'success'" (click)="verificar(p)">
              {{ p.verificado ? 'Quitar verificación' : 'Verificar' }}
            </ion-button>
          </ion-item>
        } @empty {
          <p>No hay productores en esta lista.</p>
        }
      </ion-list>

      <h3>Moderar un producto</h3>
      <ion-item>
        <ion-input label="ID del producto" type="number" [value]="productoId()" (ionInput)="productoId.set(+($event.detail.value ?? 0))" />
        <ion-button slot="end" color="danger" (click)="ocultar(true)">Ocultar</ion-button>
        <ion-button slot="end" fill="outline" (click)="ocultar(false)">Mostrar</ion-button>
      </ion-item>
    </ion-content>
  `,
})
export class AdminPage implements OnInit {
  auth = inject(AuthService);
  private srv = inject(AdminService);
  private avisos = inject(AvisosService);
  vista = signal<'pendientes' | 'verificados'>('pendientes');
  productores = signal<Productor[]>([]);
  productoId = signal(0);

  constructor() {
    addIcons({ logOutOutline });
  }

  ngOnInit() {
    this.cargar();
  }

  cambiarVista(v: 'pendientes' | 'verificados') {
    this.vista.set(v);
    this.cargar();
  }

  async cargar() {
    try { this.productores.set(await this.srv.productores(this.vista() === 'verificados')); } catch (e) { this.avisos.error(e); }
  }

  async verificar(p: Productor) {
    try {
      await this.srv.verificar(p.id, !p.verificado);
      await this.cargar();
    } catch (e) {
      this.avisos.error(e);
    }
  }

  async ocultar(oculto: boolean) {
    if (!this.productoId()) return;
    try {
      await this.srv.ocultarProducto(this.productoId(), oculto);
      this.avisos.exito(oculto ? 'Producto oculto del catálogo' : 'Producto visible otra vez');
    } catch (e) {
      this.avisos.error(e);
    }
  }
}
