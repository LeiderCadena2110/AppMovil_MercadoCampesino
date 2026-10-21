import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import {
  IonContent, IonHeader, IonToolbar, IonButtons, IonBackButton, IonInput, IonButton, IonList, IonItem,
  IonSegment, IonSegmentButton, IonLabel, IonSelect, IonSelectOption, IonTextarea, IonInputPasswordToggle, IonSpinner,
  IonListHeader, NavController,
} from '@ionic/angular';
import { AuthService } from '../core/auth.service';
import { AvisosService } from '../core/avisos.service';
import { mensajeError } from '../core/auth.interceptor';
import { CatalogoService } from '../core/catalogo.service';
import { Municipio, Rol } from '../core/models';

@Component({
  selector: 'app-registro',
  imports: [ReactiveFormsModule, IonContent, IonHeader, IonToolbar, IonButtons, IonBackButton, IonInput,
    IonButton, IonList, IonItem, IonSegment, IonSegmentButton, IonLabel, IonSelect, IonSelectOption, IonTextarea,
    IonInputPasswordToggle, IonSpinner, IonListHeader],
  template: `
    <ion-header class="ion-no-border"><ion-toolbar>
      <ion-buttons slot="start"><ion-back-button defaultHref="/bienvenida" text="" /></ion-buttons>
    </ion-toolbar></ion-header>
    <ion-content class="ion-padding">
      <h1 class="titulo">Crea tu cuenta</h1>
      <div class="mc-tejido"></div>
      <p class="sub">¿Cómo vas a usar la app?</p>
      <ion-segment class="roles" [value]="rol()" (ionChange)="cambiarRol($event.detail.value)">
        <ion-segment-button value="COMPRADOR"><ion-label>Quiero comprar</ion-label></ion-segment-button>
        <ion-segment-button value="PRODUCTOR"><ion-label>Soy productor</ion-label></ion-segment-button>
      </ion-segment>

      <form [formGroup]="form" (ngSubmit)="crear()">
        <ion-list lines="full" class="caja">
          <ion-item><ion-input label="Nombre completo" labelPlacement="stacked" formControlName="nombre" /></ion-item>
          <ion-item><ion-input label="Correo" labelPlacement="stacked" type="email" formControlName="email" /></ion-item>
          <ion-item><ion-input label="Celular" labelPlacement="stacked" type="tel" formControlName="telefono" /></ion-item>
          <ion-item>
            <ion-input label="Contraseña (mínimo 8)" labelPlacement="stacked" type="password" formControlName="password">
              <ion-input-password-toggle slot="end" />
            </ion-input>
          </ion-item>
        </ion-list>

        @if (rol() === 'PRODUCTOR') {
          <ion-list lines="full" class="caja">
            <ion-list-header>Tu finca</ion-list-header>
            <ion-item><ion-input label="Nombre de la finca" labelPlacement="stacked" formControlName="nombreFinca" /></ion-item>
            @if (municipios().length > 0) {
              <ion-item>
                <ion-select label="Municipio" labelPlacement="stacked" formControlName="municipioId" interface="action-sheet"
                  cancelText="Cancelar" placeholder="Elige tu municipio">
                  @for (m of municipios(); track m.id) { <ion-select-option [value]="m.id">{{ m.nombre }}</ion-select-option> }
                </ion-select>
              </ion-item>
            } @else {
              <!-- Sin municipios no se puede elegir: se explica por qué y se ofrece reintentar -->
              <ion-item lines="full">
                <div class="sin-municipios">
                  <strong>Municipio</strong>
                  @if (cargandoMunicipios()) {
                    <p><ion-spinner name="dots" /> Cargando municipios… Si el servidor estaba dormido puede tardar hasta un minuto.</p>
                  } @else {
                    <p>{{ errorMunicipios() || 'No hay municipios disponibles.' }}</p>
                    <ion-button size="small" fill="outline" (click)="cargarMunicipios()">Reintentar</ion-button>
                  }
                </div>
              </ion-item>
            }
            <ion-item><ion-textarea label="¿Qué cultivas? (opcional)" labelPlacement="stacked" formControlName="descripcion" [autoGrow]="true" /></ion-item>
          </ion-list>
        }

        <ion-button expand="block" size="large" type="submit" [disabled]="form.invalid || cargando()" class="ion-margin-top">
          @if (cargando()) { <ion-spinner name="crescent" /> } @else { Crear cuenta }
        </ion-button>
      </form>
    </ion-content>
  `,
  styles: `
    .titulo { font-size: 1.9rem; line-height: 1.05; margin: 4px 0 14px; }
    .mc-tejido { width: 96px; }
    .sub { color: var(--mc-barro); margin: 14px 0 10px; }
    .roles { margin-bottom: 18px; }
    .caja { border-radius: var(--mc-radio); border: 1px solid var(--mc-borde); padding: 0; margin-bottom: 14px; }
    ion-list-header { font-family: var(--mc-titulos); font-size: 1.05rem; }
    .sin-municipios { padding: 10px 0 12px; width: 100%; }
    .sin-municipios strong { font-size: 0.85rem; font-weight: 400; }
    .sin-municipios p { margin: 6px 0 8px; color: var(--ion-color-danger); font-size: 0.9rem; line-height: 1.4; display: flex; gap: 6px; align-items: center; }
  `,
})
export class RegistroPage implements OnInit {
  private auth = inject(AuthService);
  private nav = inject(NavController);
  private avisos = inject(AvisosService);
  private catalogo = inject(CatalogoService);
  rol = signal<Rol>('COMPRADOR');
  municipios = signal<Municipio[]>([]);
  cargandoMunicipios = signal(false);
  errorMunicipios = signal('');
  cargando = signal(false);

  form = inject(FormBuilder).nonNullable.group({
    nombre: ['', [Validators.required, Validators.minLength(2)]],
    email: ['', [Validators.required, Validators.email]],
    telefono: [''],
    password: ['', [Validators.required, Validators.minLength(8)]],
    nombreFinca: [''],
    municipioId: [0],
    descripcion: [''],
  });

  ngOnInit() {
    this.cargarMunicipios();
  }

  /** Trae los municipios de la API. Si falla, se muestra el motivo y un botón Reintentar. */
  async cargarMunicipios() {
    this.cargandoMunicipios.set(true);
    this.errorMunicipios.set('');
    try {
      const lista = await this.catalogo.municipios();
      this.municipios.set(lista);
      if (lista.length === 0) this.errorMunicipios.set('El servidor no tiene municipios registrados (falta ejecutar npm run db:seed).');
    } catch (e) {
      this.errorMunicipios.set(`No se pudieron cargar los municipios. ${mensajeError(e)}`);
    } finally {
      this.cargandoMunicipios.set(false);
    }
  }

  cambiarRol(valor: unknown) {
    this.rol.set(valor as Rol);
    const finca = this.form.controls.nombreFinca;
    const municipio = this.form.controls.municipioId;
    if (valor === 'PRODUCTOR') {
      if (this.municipios().length === 0 && !this.cargandoMunicipios()) this.cargarMunicipios();
      finca.setValidators([Validators.required, Validators.minLength(2)]);
      municipio.setValidators([Validators.required, Validators.min(1)]);
    } else {
      finca.clearValidators();
      municipio.clearValidators();
    }
    finca.updateValueAndValidity();
    municipio.updateValueAndValidity();
  }

  async crear() {
    this.cargando.set(true);
    const v = this.form.getRawValue();
    const datos: Record<string, unknown> = { rol: this.rol(), nombre: v.nombre, email: v.email, password: v.password };
    if (v.telefono) datos['telefono'] = v.telefono;
    if (this.rol() === 'PRODUCTOR') Object.assign(datos, { nombreFinca: v.nombreFinca, municipioId: v.municipioId, descripcion: v.descripcion || undefined });
    try {
      const u = await this.auth.registrar(datos);
      await this.avisos.exito('¡Cuenta creada!');
      await this.nav.navigateRoot(this.auth.inicioDe(u.rol));
    } catch (e) {
      this.avisos.error(e);
    } finally {
      this.cargando.set(false);
    }
  }
}
