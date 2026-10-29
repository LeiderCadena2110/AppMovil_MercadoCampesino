import { Component, OnInit, inject, input, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import {
  IonContent, IonHeader, IonToolbar, IonTitle, IonButtons, IonBackButton, IonList, IonItem, IonInput, IonTextarea, IonSelect,
  IonSelectOption, IonToggle, IonButton, IonIcon, IonImg, IonFooter, IonSpinner, NavController,
} from '@ionic/angular';
import { Capacitor } from '@capacitor/core';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { addIcons } from 'ionicons';
import { cameraOutline, sparkles } from 'ionicons/icons';
import { MisProductosService } from '../core/my-products.service';
import { CatalogoService } from '../core/catalog.service';
import { AvisosService } from '../core/notifications.service';
import { Categoria, Municipio, UNIDADES } from '../core/models';
import { IaService, PrecioSugerido } from '../core/ai.service';
import { AuthService } from '../core/auth.service';
import { CopPipe } from '../shared/format';

@Component({
  selector: 'app-producto-form',
  imports: [ReactiveFormsModule, IonContent, IonHeader, IonToolbar, IonTitle, IonButtons, IonBackButton, IonList, IonItem,
    IonInput, IonTextarea, IonSelect, IonSelectOption, IonToggle, IonButton, IonIcon, IonImg, IonFooter, IonSpinner, CopPipe],
  template: `
    <ion-header><ion-toolbar color="primary">
      <ion-buttons slot="start"><ion-back-button defaultHref="/productor/tabs/productos" text="" /></ion-buttons>
      <ion-title>{{ id() ? 'Editar producto' : 'Nuevo producto' }}</ion-title>
    </ion-toolbar></ion-header>
    <ion-content>
      <div class="foto" (click)="elegirFoto()">
        @if (vistaPrevia()) { <ion-img [src]="vistaPrevia()" alt="Foto del producto" /> }
        @else { <div class="vacia"><ion-icon name="camera-outline" /><p>Toca para agregar una foto</p></div> }
      </div>
      <!-- En el navegador se usa un selector de archivos; en el teléfono, la cámara -->
      <input #archivo type="file" accept="image/*" hidden (change)="desdeArchivo($any($event.target).files?.[0])" />

      <form [formGroup]="form">
        <ion-list lines="full">
          <ion-item><ion-input label="Nombre" labelPlacement="stacked" formControlName="nombre" placeholder="Papa pastusa" /></ion-item>
          <ion-item>
            <ion-select label="Categoría" labelPlacement="stacked" formControlName="categoriaId" interface="action-sheet" cancelText="Cancelar">
              @for (c of categorias(); track c.id) { <ion-select-option [value]="c.id">{{ c.nombre }}</ion-select-option> }
            </ion-select>
          </ion-item>
          <ion-item><ion-input label="Precio (COP)" labelPlacement="stacked" type="number" inputmode="numeric" formControlName="precio" /></ion-item>
          <ion-item>
            <ion-select label="Unidad" labelPlacement="stacked" formControlName="unidad" interface="action-sheet" cancelText="Cancelar">
              @for (u of unidades; track u) { <ion-select-option [value]="u">{{ u }}</ion-select-option> }
            </ion-select>
          </ion-item>
          <ion-item lines="none" class="ayuda-ia">
            <div class="ia">
              <button type="button" class="ia-boton" (click)="sugerirPrecio()" [disabled]="!puedeSugerir() || sugiriendo()">
                @if (sugiriendo()) { <ion-spinner name="dots" /> } @else { <ion-icon name="sparkles" /> }
                Sugerir precio
              </button>
              @if (sugerencia(); as s) {
                <p>{{ s.explicacion }}</p>
                @if (s.sugerido) {
                  <button type="button" class="usar" (click)="form.controls.precio.setValue(s.sugerido)">Usar {{ s.sugerido | cop }}</button>
                }
              }
            </div>
          </ion-item>
          <ion-item><ion-input label="Cantidad disponible" labelPlacement="stacked" type="number" inputmode="numeric" formControlName="stock" /></ion-item>
          <ion-item>
            <ion-textarea label="Descripción (opcional)" labelPlacement="stacked" formControlName="descripcion" [autoGrow]="true"
              [counter]="true" maxlength="600" placeholder="Cómo se cultiva, para qué sirve, cuándo se cosechó..." />
          </ion-item>
          <ion-item lines="none" class="ayuda-ia">
            <div class="ia">
              <button type="button" class="ia-boton" (click)="escribirDescripcion()" [disabled]="form.controls.nombre.invalid || escribiendo()">
                @if (escribiendo()) { <ion-spinner name="dots" /> } @else { <ion-icon name="sparkles" /> }
                {{ form.controls.descripcion.value ? 'Mejorar con IA' : 'Escribir con IA' }}
              </button>
              <p>La IA usa el nombre, la categoría, tu finca y lo que escribas arriba. Revísala antes de guardar.</p>
            </div>
          </ion-item>
          <ion-item><ion-toggle formControlName="activo">Visible para compradores</ion-toggle></ion-item>
        </ion-list>
      </form>
    </ion-content>
    <ion-footer class="ion-padding">
      <ion-button expand="block" size="large" [disabled]="form.invalid || guardando()" (click)="guardar()">
        @if (guardando()) { <ion-spinner name="crescent" /> } @else { Guardar }
      </ion-button>
    </ion-footer>
  `,
  styles: `
    .foto { height: 200px; background: color-mix(in srgb, var(--ion-color-primary) 9%, var(--mc-superficie)); cursor: pointer; }
    .foto ion-img { height: 200px; object-fit: cover; }
    .vacia { height: 100%; display: grid; place-content: center; text-align: center; color: var(--ion-color-medium); }
    .vacia ion-icon { font-size: 48px; justify-self: center; }
    .ayuda-ia { --background: transparent; }
    .ia { width: 100%; padding: 4px 0 10px; }
    .ia p { margin: 8px 0 0; font-size: 0.85rem; color: var(--mc-barro); line-height: 1.4; }
    .ia-boton { display: inline-flex; align-items: center; gap: 6px; padding: 9px 14px; border-radius: 999px; border: 0;
      background: var(--mc-marca); color: var(--mc-marca-texto); font: inherit; font-weight: 700; font-size: 0.9rem; }
    .ia-boton ion-icon { color: var(--mc-destaque); }
    .ia-boton:disabled { opacity: 0.45; }
    .usar { margin-top: 8px; padding: 8px 14px; border-radius: 999px; border: 0; background: var(--mc-accion); color: var(--mc-accion-texto);
      font: inherit; font-weight: 700; font-size: 0.9rem; }
  `,
})
export class ProductoFormPage implements OnInit {
  id = input<string>(); // vacío = nuevo
  private srv = inject(MisProductosService);
  private catalogo = inject(CatalogoService);
  private avisos = inject(AvisosService);
  private nav = inject(NavController);
  unidades = UNIDADES;
  categorias = signal<Categoria[]>([]);
  vistaPrevia = signal<string | null>(null);
  guardando = signal(false);
  private fotoNueva: Blob | null = null;
  private ia = inject(IaService);
  private productor = inject(AuthService).usuario()?.productor;
  private municipios: Municipio[] = [];
  escribiendo = signal(false);
  sugiriendo = signal(false);
  sugerencia = signal<PrecioSugerido | null>(null);

  form = inject(FormBuilder).nonNullable.group({
    nombre: ['', [Validators.required, Validators.minLength(2)]],
    categoriaId: [0, [Validators.required, Validators.min(1)]],
    precio: [0, [Validators.required, Validators.min(1)]],
    unidad: ['kg', Validators.required],
    stock: [0, [Validators.required, Validators.min(0)]],
    descripcion: ['', Validators.maxLength(600)],
    activo: [true],
  });

  constructor() {
    addIcons({ cameraOutline, sparkles });
  }

  async ngOnInit() {
    try {
      this.categorias.set(await this.catalogo.categorias());
      this.catalogo.municipios().then((m) => (this.municipios = m)).catch(() => undefined);
      if (this.id()) {
        const p = (await this.srv.listar()).find((x) => x.id === +this.id()!);
        if (p) {
          this.form.patchValue({ ...p, precio: Number(p.precio), descripcion: p.descripcion ?? '' });
          this.vistaPrevia.set(p.fotoUrl);
        }
      }
    } catch (e) {
      this.avisos.error(e);
    }
  }

  puedeSugerir() {
    const f = this.form.controls;
    return f.nombre.valid && f.categoriaId.valid && !!f.unidad.value;
  }

  /** Pide a la IA que redacte (o mejore) la descripción */
  async escribirDescripcion() {
    const f = this.form.getRawValue();
    this.escribiendo.set(true);
    try {
      const r = await this.ia.descripcion({
        nombre: f.nombre,
        unidad: f.unidad,
        categoria: this.categorias().find((c) => c.id === f.categoriaId)?.nombre,
        finca: this.productor?.nombreFinca,
        municipio: this.municipios.find((m) => m.id === this.productor?.municipioId)?.nombre,
        notas: f.descripcion || undefined,
      });
      this.form.controls.descripcion.setValue(r.descripcion);
      this.form.controls.descripcion.markAsDirty();
    } catch (e) {
      this.avisos.error(e);
    } finally {
      this.escribiendo.set(false);
    }
  }

  /** Precio sugerido según productos parecidos publicados en la app */
  async sugerirPrecio() {
    const f = this.form.getRawValue();
    this.sugiriendo.set(true);
    try {
      this.sugerencia.set(await this.ia.precio({ nombre: f.nombre, categoriaId: f.categoriaId, unidad: f.unidad }));
    } catch (e) {
      this.avisos.error(e);
    } finally {
      this.sugiriendo.set(false);
    }
  }

  async elegirFoto() {
    if (!Capacitor.isNativePlatform()) {
      document.querySelector<HTMLInputElement>('app-producto-form input[type=file]')?.click();
      return;
    }
    try {
      // Calidad 70 y ancho 1200: fotos livianas para ahorrar datos
      const foto = await Camera.getPhoto({ source: CameraSource.Prompt, resultType: CameraResultType.Uri, quality: 70, width: 1200,
        promptLabelHeader: 'Foto del producto', promptLabelPhoto: 'Elegir de la galería', promptLabelPicture: 'Tomar foto', promptLabelCancel: 'Cancelar' });
      if (!foto.webPath) return;
      this.fotoNueva = await (await fetch(foto.webPath)).blob();
      this.vistaPrevia.set(foto.webPath);
    } catch {
      // el usuario canceló
    }
  }

  desdeArchivo(archivo?: File) {
    if (!archivo) return;
    this.fotoNueva = archivo;
    this.vistaPrevia.set(URL.createObjectURL(archivo));
  }

  async guardar() {
    this.guardando.set(true);
    try {
      const datos = this.form.getRawValue();
      const p = this.id() ? await this.srv.actualizar(+this.id()!, datos) : await this.srv.crear(datos);
      if (this.fotoNueva) await this.srv.subirFoto(p.id, this.fotoNueva);
      await this.avisos.exito('Producto guardado');
      await this.nav.navigateBack('/productor/tabs/productos');
    } catch (e) {
      this.avisos.error(e);
    } finally {
      this.guardando.set(false);
    }
  }
}
