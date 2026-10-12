import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import {
  IonContent, IonHeader, IonToolbar, IonTitle, IonButtons, IonBackButton, IonInput, IonButton, IonList, IonItem,
  IonSegment, IonSegmentButton, IonLabel, IonSelect, IonSelectOption, IonTextarea, IonInputPasswordToggle, IonSpinner,
  IonListHeader, NavController,
} from '@ionic/angular';
import { AuthService } from '../core/auth.service';
import { AvisosService } from '../core/avisos.service';
import { CatalogoService } from '../core/catalogo.service';
import { Municipio, Rol } from '../core/models';

@Component({
  selector: 'app-registro',
  imports: [ReactiveFormsModule, IonContent, IonHeader, IonToolbar, IonTitle, IonButtons, IonBackButton, IonInput,
    IonButton, IonList, IonItem, IonSegment, IonSegmentButton, IonLabel, IonSelect, IonSelectOption, IonTextarea,
    IonInputPasswordToggle, IonSpinner, IonListHeader],
  template: `
    <ion-header><ion-toolbar color="primary">
      <ion-buttons slot="start"><ion-back-button defaultHref="/bienvenida" /></ion-buttons>
      <ion-title>Crear cuenta</ion-title>
    </ion-toolbar></ion-header>
    <ion-content class="ion-padding">
      <p>¿Cómo vas a usar la app?</p>
      <ion-segment [value]="rol()" (ionChange)="cambiarRol($event.detail.value)">
        <ion-segment-button value="COMPRADOR"><ion-label>Quiero comprar</ion-label></ion-segment-button>
        <ion-segment-button value="PRODUCTOR"><ion-label>Soy productor</ion-label></ion-segment-button>
      </ion-segment>

      <form [formGroup]="form" (ngSubmit)="crear()">
        <ion-list lines="full">
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
          <ion-list lines="full">
            <ion-list-header>Tu finca</ion-list-header>
            <ion-item><ion-input label="Nombre de la finca" labelPlacement="stacked" formControlName="nombreFinca" /></ion-item>
            <ion-item>
              <ion-select label="Municipio" labelPlacement="stacked" formControlName="municipioId" interface="action-sheet" cancelText="Cancelar">
                @for (m of municipios(); track m.id) { <ion-select-option [value]="m.id">{{ m.nombre }}</ion-select-option> }
              </ion-select>
            </ion-item>
            <ion-item><ion-textarea label="¿Qué cultivas? (opcional)" labelPlacement="stacked" formControlName="descripcion" [autoGrow]="true" /></ion-item>
          </ion-list>
        }

        <ion-button expand="block" size="large" type="submit" [disabled]="form.invalid || cargando()" class="ion-margin-top">
          @if (cargando()) { <ion-spinner name="crescent" /> } @else { Crear cuenta }
        </ion-button>
      </form>
    </ion-content>
  `,
})
export class RegistroPage implements OnInit {
  private auth = inject(AuthService);
  private nav = inject(NavController);
  private avisos = inject(AvisosService);
  private catalogo = inject(CatalogoService);
  rol = signal<Rol>('COMPRADOR');
  municipios = signal<Municipio[]>([]);
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

  async ngOnInit() {
    try { this.municipios.set(await this.catalogo.municipios()); } catch (e) { this.avisos.error(e); }
  }

  cambiarRol(valor: unknown) {
    this.rol.set(valor as Rol);
    const finca = this.form.controls.nombreFinca;
    const municipio = this.form.controls.municipioId;
    if (valor === 'PRODUCTOR') {
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
