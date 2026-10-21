import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import {
  IonContent, IonHeader, IonToolbar, IonButtons, IonBackButton, IonInput, IonButton, IonList, IonItem,
  IonInputPasswordToggle, IonSpinner, NavController,
} from '@ionic/angular';
import { AuthService } from '../core/auth.service';
import { AvisosService } from '../core/notifications.service';

@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule, RouterLink, IonContent, IonHeader, IonToolbar, IonButtons, IonBackButton,
    IonInput, IonButton, IonList, IonItem, IonInputPasswordToggle, IonSpinner],
  template: `
    <ion-header class="ion-no-border"><ion-toolbar>
      <ion-buttons slot="start"><ion-back-button defaultHref="/bienvenida" text="" /></ion-buttons>
    </ion-toolbar></ion-header>
    <ion-content class="ion-padding">
      <h1 class="titulo">Qué bueno verte de nuevo</h1>
      <div class="mc-tejido"></div>
      <p class="sub">Entra con el correo y la contraseña de tu cuenta.</p>
      <form [formGroup]="form" (ngSubmit)="entrar()">
        <ion-list lines="full" class="caja">
          <ion-item><ion-input label="Correo" labelPlacement="stacked" type="email" formControlName="email" autocomplete="email" /></ion-item>
          <ion-item>
            <ion-input label="Contraseña" labelPlacement="stacked" type="password" formControlName="password">
              <ion-input-password-toggle slot="end" />
            </ion-input>
          </ion-item>
        </ion-list>
        <ion-button expand="block" size="large" type="submit" [disabled]="form.invalid || cargando()" class="ion-margin-top">
          @if (cargando()) { <ion-spinner name="crescent" /> } @else { Entrar }
        </ion-button>
        <ion-button expand="block" fill="clear" routerLink="/registro">¿No tienes cuenta? Regístrate</ion-button>
      </form>
    </ion-content>
  `,
  styles: `
    .titulo { font-size: 1.9rem; line-height: 1.05; margin: 4px 0 14px; max-width: 14ch; }
    .mc-tejido { width: 96px; }
    .sub { color: var(--mc-barro); margin: 14px 0 22px; }
    .caja { border-radius: var(--mc-radio); border: 1px solid var(--mc-borde); padding: 0; }
  `,
})
export class LoginPage {
  private auth = inject(AuthService);
  private nav = inject(NavController);
  private avisos = inject(AvisosService);
  cargando = signal(false);
  form = inject(FormBuilder).nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', Validators.required],
  });

  async entrar() {
    this.cargando.set(true);
    try {
      const { email, password } = this.form.getRawValue();
      const u = await this.auth.login(email, password);
      // navigateRoot limpia la pila: "atrás" no vuelve al login
      await this.nav.navigateRoot(this.auth.inicioDe(u.rol));
    } catch (e) {
      this.avisos.error(e);
    } finally {
      this.cargando.set(false);
    }
  }
}
