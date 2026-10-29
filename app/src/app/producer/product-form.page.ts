import { Component, OnInit, computed, inject, input, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import {
  IonContent, IonHeader, IonToolbar, IonTitle, IonButtons, IonBackButton, IonList, IonItem, IonInput, IonTextarea, IonSelect,
  IonSelectOption, IonButton, IonIcon, IonFooter, IonSpinner, NavController,
} from '@ionic/angular';
import { Capacitor } from '@capacitor/core';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { addIcons } from 'ionicons';
import { cameraOutline, sparkles, trashOutline, locationOutline, swapHorizontalOutline, informationCircleOutline } from 'ionicons/icons';
import { MisProductosService } from '../core/my-products.service';
import { CatalogoService } from '../core/catalog.service';
import { AvisosService } from '../core/notifications.service';
import { Categoria, Municipio, UNIDADES } from '../core/models';
import { IaService, PrecioSugerido } from '../core/ai.service';
import { AuthService } from '../core/auth.service';
import { CopPipe } from '../shared/format';

/** Lo mismo que acepta la API al subir fotos */
const TIPOS_FOTO = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_FOTO_MB = 5;

@Component({
  selector: 'app-producto-form',
  imports: [ReactiveFormsModule, IonContent, IonHeader, IonToolbar, IonTitle, IonButtons, IonBackButton, IonList, IonItem,
    IonInput, IonTextarea, IonSelect, IonSelectOption, IonButton, IonIcon, IonFooter, IonSpinner, CopPipe],
  template: `
    <ion-header class="ion-no-border"><ion-toolbar>
      <ion-buttons slot="start"><ion-back-button defaultHref="/productor/tabs/productos" text="" /></ion-buttons>
      <ion-title>{{ id() ? 'Editar producto' : 'Publicar producto' }}</ion-title>
      @if (id()) {
        <ion-buttons slot="end">
          <ion-button color="danger" (click)="eliminar()" aria-label="Eliminar producto"><ion-icon slot="icon-only" name="trash-outline" /></ion-button>
        </ion-buttons>
      }
    </ion-toolbar></ion-header>

    <ion-content class="ion-padding">
      @if (id() && !activoActual()) {
        <p class="aviso"><ion-icon name="information-circle-outline" /> Este producto está guardado como borrador o pausado: los compradores no lo ven.</p>
      }

      <!-- 1. Foto -->
      <section class="bloque">
        <h2>Foto</h2>
        <button type="button" class="foto mc-tocable" (click)="elegirFoto()" [attr.aria-label]="vistaPrevia() ? 'Cambiar foto' : 'Agregar foto'">
          @if (vistaPrevia()) {
            <img [src]="vistaPrevia()" alt="Foto del producto" />
            <span class="cambiar"><ion-icon name="swap-horizontal-outline" /> Cambiar foto</span>
          } @else {
            <span class="vacia"><ion-icon name="camera-outline" /><strong>Agregar foto</strong><small>Con buena luz y el producto de cerca</small></span>
          }
        </button>
        @if (errorFoto()) { <p class="error">{{ errorFoto() }}</p> }
        <!-- En el navegador se usa un selector de archivos; en el teléfono, la cámara -->
        <input type="file" accept="image/jpeg,image/png,image/webp" hidden (change)="desdeArchivo($any($event.target).files?.[0])" />
      </section>

      <form [formGroup]="form">
        <!-- 2. Qué vendes -->
        <section class="bloque">
          <h2>¿Qué vendes?</h2>
          <ion-list lines="full" class="caja">
            <ion-item>
              <ion-input label="Nombre" labelPlacement="stacked" formControlName="nombre" placeholder="Papa pastusa" maxlength="120"
                [class.ion-invalid]="invalido('nombre')" [class.ion-touched]="invalido('nombre')"
                errorText="Escribe el nombre (mínimo 2 letras)" />
            </ion-item>
            <ion-item>
              <ion-select label="Categoría" labelPlacement="stacked" formControlName="categoriaId" interface="action-sheet"
                cancelText="Cancelar" placeholder="Elige una categoría">
                @for (c of categorias(); track c.id) { <ion-select-option [value]="c.id">{{ c.nombre }}</ion-select-option> }
              </ion-select>
            </ion-item>
            <ion-item>
              <ion-textarea label="Descripción (opcional)" labelPlacement="stacked" formControlName="descripcion" [autoGrow]="true"
                [counter]="true" maxlength="600" placeholder="Cómo se cultiva, cuándo se cosechó, para qué sirve..." />
            </ion-item>
          </ion-list>
          @if (invalido('categoriaId')) { <p class="error">Elige una categoría.</p> }
          <div class="ia">
            <button type="button" class="ia-boton mc-tocable" (click)="escribirDescripcion()" [disabled]="form.controls.nombre.invalid || escribiendo()">
              @if (escribiendo()) { <ion-spinner name="dots" /> } @else { <ion-icon name="sparkles" /> }
              {{ form.controls.descripcion.value ? 'Mejorar con IA' : 'Escribir con IA' }}
            </button>
            <p>La IA usa el nombre, la categoría, tu finca y lo que escribas. Revisa el texto antes de publicar.</p>
          </div>
        </section>

        <!-- 3. Precio y cantidad -->
        <section class="bloque">
          <h2>Precio y cantidad</h2>
          <ion-list lines="full" class="caja">
            <ion-item>
              <ion-select label="Unidad de venta" labelPlacement="stacked" formControlName="unidad" interface="action-sheet" cancelText="Cancelar">
                @for (u of unidades; track u) { <ion-select-option [value]="u">{{ u }}</ion-select-option> }
              </ion-select>
            </ion-item>
            <ion-item>
              <ion-input [label]="'Precio por ' + form.controls.unidad.value + ' (COP)'" labelPlacement="stacked" type="number"
                inputmode="numeric" min="1" formControlName="precio"
                [class.ion-invalid]="invalido('precio')" [class.ion-touched]="invalido('precio')" errorText="El precio debe ser mayor que 0" />
            </ion-item>
            <ion-item>
              <ion-input [label]="'Cantidad disponible (' + form.controls.unidad.value + ')'" labelPlacement="stacked" type="number"
                inputmode="numeric" min="0" step="1" formControlName="stock"
                [class.ion-invalid]="invalido('stock')" [class.ion-touched]="invalido('stock')" errorText="Usa un número entero, 0 o más" />
            </ion-item>
          </ion-list>
          <div class="ia">
            <button type="button" class="ia-boton mc-tocable" (click)="sugerirPrecio()" [disabled]="!puedeSugerir() || sugiriendo()">
              @if (sugiriendo()) { <ion-spinner name="dots" /> } @else { <ion-icon name="sparkles" /> }
              Ver precio de referencia
            </button>
            @if (sugerencia(); as s) {
              <div class="referencia">
                <p>{{ s.explicacion }}</p>
                <p class="nota">Es solo una orientación con base en lo publicado en Minga App, no un precio garantizado. Tú decides el precio final.</p>
                @if (s.sugerido) {
                  <button type="button" class="usar mc-tocable" (click)="usarPrecio(s.sugerido)">Usar {{ s.sugerido | cop }}</button>
                }
              </div>
            } @else if (!puedeSugerir()) {
              <p>Escribe el nombre y elige la categoría para ver precios de productos parecidos.</p>
            }
          </div>
        </section>

        <!-- 4. Procedencia (viene del perfil del productor) -->
        <section class="bloque">
          <h2>Procedencia</h2>
          <p class="procedencia">
            <ion-icon name="location-outline" />
            <span><strong>{{ finca || 'Tu finca' }}</strong>{{ municipio() ? ', ' + municipio() : '' }}, Nariño</span>
          </p>
          <p class="nota">Los compradores ven de dónde viene tu producto. Se toma de los datos de tu finca.</p>
        </section>
      </form>
    </ion-content>

    <ion-footer class="ion-no-border pie">
      <ion-button fill="outline" [disabled]="guardando()" (click)="guardar(false)">
        Guardar borrador
      </ion-button>
      <ion-button [disabled]="guardando()" (click)="guardar(true)">
        @if (guardando()) { <ion-spinner name="crescent" /> } @else { Publicar }
      </ion-button>
    </ion-footer>
  `,
  styles: `
    .aviso { display: flex; gap: 8px; align-items: flex-start; margin: 0 0 12px; padding: 12px 14px; border-radius: var(--mc-radio);
      background: var(--mc-suelo); color: var(--mc-barro); font-size: 0.92rem; }
    .bloque { margin-bottom: 22px; }
    h2 { font-size: 1.1rem; margin: 0 0 10px; }
    .caja { border: 1px solid var(--mc-borde); border-radius: var(--mc-radio); padding: 0; }
    .foto { position: relative; display: block; width: 100%; aspect-ratio: 4 / 3; max-height: 260px; padding: 0; overflow: hidden; cursor: pointer;
      border-radius: var(--mc-radio); border: 2px dashed var(--mc-borde); background: var(--mc-suelo); }
    .foto img { width: 100%; height: 100%; object-fit: cover; display: block; }
    .vacia { height: 100%; display: grid; place-content: center; justify-items: center; gap: 4px; color: var(--mc-arcilla); }
    .vacia ion-icon { font-size: 44px; }
    .vacia small { color: var(--mc-tinta-suave); }
    .cambiar { position: absolute; right: 10px; bottom: 10px; display: inline-flex; gap: 6px; align-items: center; padding: 8px 12px;
      border-radius: 999px; background: rgba(0,0,0,.6); color: #fff; font-weight: 700; font-size: 0.85rem; }
    .error { color: var(--ion-color-danger); font-size: 0.88rem; margin: 6px 4px 0; }
    .ia { margin-top: 10px; }
    .ia p, .nota { margin: 8px 0 0; font-size: 0.85rem; color: var(--mc-tinta-suave); line-height: 1.4; }
    .ia-boton { display: inline-flex; align-items: center; gap: 6px; padding: 10px 14px; min-height: 44px; border-radius: 999px; border: 0;
      background: var(--mc-marca); color: var(--mc-marca-texto); font: inherit; font-weight: 700; font-size: 0.9rem; cursor: pointer; }
    .ia-boton ion-icon { color: var(--mc-destaque); }
    .ia-boton:disabled { opacity: 0.45; }
    .referencia { margin-top: 10px; padding: 12px 14px; border-radius: var(--mc-radio); background: var(--mc-superficie); border: 1px solid var(--mc-borde); }
    .referencia p:first-child { margin: 0; color: var(--ion-text-color); }
    .usar { margin-top: 10px; padding: 10px 16px; min-height: 44px; border-radius: 999px; border: 0; background: var(--mc-accion); color: var(--mc-accion-texto);
      font: inherit; font-weight: 700; font-size: 0.9rem; cursor: pointer; }
    .procedencia { display: flex; gap: 8px; align-items: center; margin: 0; padding: 12px 14px; border-radius: var(--mc-radio);
      background: var(--mc-suelo); color: var(--mc-barro); }
    .pie { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; padding: 10px 16px calc(10px + var(--ion-safe-area-bottom, 0px));
      background: var(--mc-superficie); border-top: 1px solid var(--mc-borde); }
    .pie ion-button { margin: 0; min-height: 52px; }
  `,
})
export class ProductoFormPage implements OnInit {
  id = input<string>(); // vacío = nuevo
  private srv = inject(MisProductosService);
  private catalogo = inject(CatalogoService);
  private avisos = inject(AvisosService);
  private nav = inject(NavController);
  private ia = inject(IaService);
  private productor = inject(AuthService).usuario()?.productor;
  readonly unidades = UNIDADES;
  readonly finca = this.productor?.nombreFinca ?? '';
  categorias = signal<Categoria[]>([]);
  municipios = signal<Municipio[]>([]);
  municipio = computed(() => this.municipios().find((m) => m.id === this.productor?.municipioId)?.nombre ?? '');
  vistaPrevia = signal<string | null>(null);
  errorFoto = signal('');
  guardando = signal(false);
  escribiendo = signal(false);
  sugiriendo = signal(false);
  sugerencia = signal<PrecioSugerido | null>(null);
  activoActual = signal(true);
  private fotoNueva: Blob | null = null;

  form = inject(FormBuilder).nonNullable.group({
    nombre: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(120)]],
    categoriaId: [0, [Validators.required, Validators.min(1)]],
    precio: [0, [Validators.required, Validators.min(1), Validators.max(100_000_000)]],
    unidad: ['kg', Validators.required],
    stock: [0, [Validators.required, Validators.min(0), Validators.pattern(/^\d+$/)]],
    descripcion: ['', Validators.maxLength(600)],
  });

  constructor() {
    addIcons({ cameraOutline, sparkles, trashOutline, locationOutline, swapHorizontalOutline, informationCircleOutline });
  }

  async ngOnInit() {
    this.catalogo.municipios().then((m) => this.municipios.set(m)).catch(() => undefined);
    try {
      this.categorias.set(await this.catalogo.categorias());
      if (this.id()) {
        const p = (await this.srv.listar()).find((x) => x.id === +this.id()!);
        if (p) {
          this.form.patchValue({ ...p, precio: Number(p.precio), descripcion: p.descripcion ?? '' });
          this.vistaPrevia.set(p.fotoUrl);
          this.activoActual.set(p.activo);
        }
      }
    } catch (e) {
      this.avisos.error(e);
    }
  }

  /** Mostrar error solo después de que el campo se tocó (o al intentar guardar) */
  invalido(campo: keyof typeof this.form.controls) {
    const c = this.form.controls[campo];
    return c.invalid && (c.touched || c.dirty);
  }

  puedeSugerir() {
    const f = this.form.controls;
    return f.nombre.valid && f.categoriaId.valid && !!f.unidad.value;
  }

  usarPrecio(valor: number) {
    this.form.controls.precio.setValue(valor);
    this.form.controls.precio.markAsDirty();
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
        finca: this.finca || undefined,
        municipio: this.municipio() || undefined,
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

  /** Precio de referencia según productos parecidos publicados en la app */
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
      this.usarFoto(await (await fetch(foto.webPath)).blob(), foto.webPath);
    } catch {
      // el usuario canceló
    }
  }

  desdeArchivo(archivo?: File) {
    if (archivo) this.usarFoto(archivo, URL.createObjectURL(archivo));
  }

  private usarFoto(foto: Blob, vista: string) {
    if (foto.type && !TIPOS_FOTO.includes(foto.type)) {
      this.errorFoto.set('Usa una foto JPG, PNG o WebP.');
      return;
    }
    if (foto.size > MAX_FOTO_MB * 1024 * 1024) {
      this.errorFoto.set(`La foto pesa más de ${MAX_FOTO_MB} MB. Elige otra o tómala de nuevo.`);
      return;
    }
    this.errorFoto.set('');
    this.fotoNueva = foto;
    this.vistaPrevia.set(vista);
  }

  /** publicar = visible para compradores; si no, queda como borrador (no visible) */
  async guardar(publicar: boolean) {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.avisos.error(new Error('Revisa los campos marcados'));
      return;
    }
    this.guardando.set(true);
    try {
      const datos = { ...this.form.getRawValue(), activo: publicar };
      const p = this.id() ? await this.srv.actualizar(+this.id()!, datos) : await this.srv.crear(datos);
      if (this.fotoNueva) await this.srv.subirFoto(p.id, this.fotoNueva);
      await this.avisos.exito(publicar ? 'Producto publicado' : 'Guardado como borrador: los compradores aún no lo ven');
      await this.nav.navigateBack('/productor/tabs/productos');
    } catch (e) {
      this.avisos.error(e);
    } finally {
      this.guardando.set(false);
    }
  }

  async eliminar() {
    const nombre = this.form.controls.nombre.value || 'este producto';
    if (!(await this.avisos.confirmar('Eliminar producto', `¿Eliminar "${nombre}"? Esta acción no se puede deshacer.`, 'Eliminar'))) return;
    try {
      const r = await this.srv.eliminar(+this.id()!);
      this.avisos.exito(r.desactivado ? 'Tenía pedidos: quedó pausado para conservar el historial' : 'Producto eliminado');
      await this.nav.navigateBack('/productor/tabs/productos');
    } catch (e) {
      this.avisos.error(e);
    }
  }
}
