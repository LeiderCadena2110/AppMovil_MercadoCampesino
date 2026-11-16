import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';
import { Component, OnInit, computed, inject, input, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import {
  IonContent, IonHeader, IonToolbar, IonTitle, IonButtons, IonBackButton, IonList, IonItem, IonInput, IonTextarea, IonSelect,
  IonSelectOption, IonButton, IonIcon, IonFooter, IonSpinner, NavController,
} from '@ionic/angular';
import { Capacitor } from '@capacitor/core';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { addIcons } from 'ionicons';
import { trendingUp, trendingDown, cloudOfflineOutline, mic, cameraOutline, sparkles, trashOutline, locationOutline, swapHorizontalOutline, informationCircleOutline } from 'ionicons/icons';
import { MisProductosService, ProductoForm } from '../core/my-products.service';
import { CatalogoService } from '../core/catalog.service';
import { AvisosService } from '../core/notifications.service';
import { Categoria, Municipio, UNIDADES } from '../core/models';
import { IaService, PrecioSugerido } from '../core/ai.service';
import { VozService, VozError } from '../core/voice.service';
import { vibrar } from '../core/haptics';
import { AuthService } from '../core/auth.service';
import { mensajeError } from '../core/auth.interceptor';
import { SincronizacionService, Cambio } from '../core/sync.service';
import { almacen } from '../core/storage';
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
      @if (!sync.enLinea()) {
        <p class="aviso sin-senal" role="status"><ion-icon name="cloud-offline-outline" /> Sin señal. Puedes llenar y guardar: el producto se publica solo cuando vuelva la conexión.</p>
      }
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
        @if (errorFoto()) { <p class="error" role="alert">{{ errorFoto() }}</p> }
        @else if (fotosDisponibles() === false) {
          <p class="nota-foto">Las fotos todavía no están activas en el servidor: puedes publicar sin foto y agregarla después.</p>
        } @else if (fotosDisponibles() && !vistaPrevia()) {
          <p class="nota-foto">La foto es obligatoria para publicar. Sin foto puedes guardar como borrador.</p>
        }
        @if (!id()) {
          <p class="nota-foto">@if (iaActiva()) { Al tomar la foto, la IA reconoce el producto y llena el formulario. } @else { Toma la foto con buena luz. }</p>
        }

        <!-- Dictado: el productor dice el producto, el precio y cuánto tiene -->
        @if (vozDisponible()) {
          <button type="button" class="dictar mc-tocable" (click)="dictar()" [disabled]="estadoIa()?.tipo === 'trabajando'">
            <ion-icon name="mic" />
            <span><strong>Dictar los datos</strong><small>Ej.: “Papa pastusa a 45 mil la arroba, tengo 40”</small></span>
          </button>
        }
        <div class="estado-ia" aria-live="polite">
          @if (estadoIa(); as e) {
            <p [class]="e.tipo">
              @if (e.tipo === 'trabajando') { <ion-spinner name="dots" /> } @else { <ion-icon [name]="e.tipo === 'listo' ? 'sparkles' : 'information-circle-outline'" /> }
              <span>{{ e.texto }}</span>
            </p>
          }
        </div>
        <!-- En el navegador se usa un selector de archivos; en el teléfono, la cámara -->
        <input type="file" accept="image/jpeg,image/png,image/webp" hidden (change)="desdeArchivo($any($event.target).files?.[0])" />
      </section>

      <form [formGroup]="form">
        <!-- 2. Qué vendes -->
        <section class="bloque">
          <h2>¿Qué vendes?</h2>
          <ion-list lines="full" class="caja">
            <ion-item [class.de-ia]="deIa().has('nombre')">
              <ion-input label="Nombre" labelPlacement="stacked" formControlName="nombre" placeholder="Papa pastusa" maxlength="120"
                [class.ion-invalid]="invalido('nombre')" [class.ion-touched]="invalido('nombre')"
                errorText="Escribe el nombre (mínimo 2 letras)" />
            </ion-item>
            <ion-item [class.de-ia]="deIa().has('categoriaId')">
              <ion-select label="Categoría" labelPlacement="stacked" formControlName="categoriaId" interface="action-sheet"
                cancelText="Cancelar" placeholder="Elige una categoría">
                @for (c of categorias(); track c.id) { <ion-select-option [value]="c.id">{{ c.nombre }}</ion-select-option> }
              </ion-select>
            </ion-item>
            <ion-item [class.de-ia]="deIa().has('descripcion')">
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
            <ion-item [class.de-ia]="deIa().has('unidad')">
              <ion-select label="Unidad de venta" labelPlacement="stacked" formControlName="unidad" interface="action-sheet" cancelText="Cancelar">
                @for (u of unidades; track u) { <ion-select-option [value]="u">{{ u }}</ion-select-option> }
              </ion-select>
            </ion-item>
            <ion-item [class.de-ia]="deIa().has('precio')">
              <ion-input [label]="'Precio por ' + form.controls.unidad.value + ' (COP)'" labelPlacement="stacked" type="number"
                inputmode="numeric" min="1" formControlName="precio"
                [class.ion-invalid]="invalido('precio')" [class.ion-touched]="invalido('precio')" errorText="El precio debe ser mayor que 0" />
            </ion-item>
            <ion-item [class.de-ia]="deIa().has('stock')">
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
                @if (s.tendencia != null && (s.tendencia >= 3 || s.tendencia <= -3)) {
                  <p class="tendencia" [class.sube]="s.tendencia > 0">
                    <ion-icon [name]="s.tendencia > 0 ? 'trending-up' : 'trending-down'" aria-hidden="true" />
                    {{ s.tendencia > 0 ? 'Subiendo' : 'Bajando' }} {{ porcentaje(s.tendencia) }} en dos semanas
                  </p>
                }
                <p>{{ s.explicacion }}</p>
                <p class="nota">Es solo una orientación con base en los precios publicados y pedidos en Minga App, no un precio garantizado. Tú decides el precio final.</p>
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
    .caja { border: 0; box-shadow: var(--mc-e1); border-radius: var(--mc-radio); padding: 0; }
    .foto { position: relative; display: block; width: 100%; aspect-ratio: 4 / 3; max-height: 260px; padding: 0; overflow: hidden; cursor: pointer;
      border-radius: var(--mc-radio); border: 2px dashed var(--mc-borde); background: var(--mc-suelo); }
    .dictar { display: flex; align-items: center; gap: 12px; width: 100%; margin-top: 12px; padding: 12px 16px; border: 0; text-align: left;
      border-radius: var(--mc-radio); background: var(--mc-superficie); box-shadow: var(--mc-e1); font: inherit; color: inherit; cursor: pointer; }
    .dictar ion-icon { flex-shrink: 0; width: 26px; height: 26px; padding: 10px; border-radius: 50%; background: var(--mc-accion); color: var(--mc-accion-texto); }
    .dictar span { display: grid; gap: 2px; }
    .dictar small { color: var(--mc-tinta-suave); }
    .dictar:disabled { opacity: 0.5; }
    .estado-ia p { display: flex; align-items: center; gap: 8px; margin: 10px 0 0; padding: 10px 12px; border-radius: var(--mc-radio-chico); font-size: 0.9rem; }
    .estado-ia ion-icon, .estado-ia ion-spinner { flex-shrink: 0; font-size: 20px; width: 20px; height: 20px; }
    .estado-ia .trabajando { background: var(--mc-suelo); }
    .estado-ia .listo { background: color-mix(in srgb, var(--mc-destaque) 22%, var(--mc-superficie)); }
    .estado-ia .listo ion-icon { color: var(--mc-barro); }
    .estado-ia .nada { background: var(--mc-suelo); color: var(--mc-tinta-suave); }
    /* Campo llenado por la IA: borde de color para que el productor lo revise */
    ion-item.de-ia { --border-color: var(--mc-destaque); --background: color-mix(in srgb, var(--mc-destaque) 9%, var(--mc-superficie)); }
    .nota-foto { margin: 6px 2px 0; font-size: 0.85rem; color: var(--mc-tinta-suave); }
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
    .referencia { margin-top: 10px; padding: 12px 14px; border-radius: var(--mc-radio); background: var(--mc-superficie); border: 0; box-shadow: var(--mc-e1); }
    .tendencia { display: inline-flex; align-items: center; gap: 6px; margin: 0 0 6px !important; padding: 3px 10px; border-radius: 999px;
      font-weight: 700; font-size: 0.85rem; background: var(--mc-suelo); color: var(--mc-barro) !important; }
    .tendencia.sube { background: color-mix(in srgb, var(--ion-color-success) 14%, var(--mc-superficie)); color: color-mix(in srgb, var(--ion-color-success) 55%, var(--mc-tinta)) !important; }
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
  /** Producto creado sin señal que aún no se envía (id del cambio en la cola) */
  pendiente = input<string>();
  sync = inject(SincronizacionService);
  /** clienteId del producto nuevo: el mismo en línea o sin señal, así nunca se duplica */
  private clienteId: string = crypto.randomUUID();
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
  /** El servidor puede guardar fotos (null mientras se consulta /api/salud) */
  fotosDisponibles = signal<boolean | null>(null);
  private http = inject(HttpClient);
  guardando = signal(false);
  escribiendo = signal(false);
  sugiriendo = signal(false);
  sugerencia = signal<PrecioSugerido | null>(null);
  activoActual = signal(true);
  private fotoNueva: Blob | null = null;
  private voz = inject(VozService);
  iaActiva = signal(false);
  vozDisponible = signal(false);
  /** Mensaje de lo que hace la IA (mirando la foto, escuchando, qué llenó) */
  estadoIa = signal<{ tipo: 'trabajando' | 'listo' | 'nada'; texto: string } | null>(null);
  /** Campos que llenó la IA (se resaltan para revisarlos) */
  deIa = signal(new Set<string>());
  /** Para medir cuánto tarda publicar un producto nuevo (meta: menos de 60 s) */
  private inicio = performance.now();

  form = inject(FormBuilder).nonNullable.group({
    nombre: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(120)]],
    categoriaId: [0, [Validators.required, Validators.min(1)]],
    precio: [0, [Validators.required, Validators.min(1), Validators.max(100_000_000)]],
    unidad: ['kg', Validators.required],
    stock: [0, [Validators.required, Validators.min(0), Validators.pattern(/^\d+$/)]],
    descripcion: ['', Validators.maxLength(600)],
  });

  constructor() {
    addIcons({ trendingUp, trendingDown, cloudOfflineOutline, mic, cameraOutline, sparkles, trashOutline, locationOutline, swapHorizontalOutline, informationCircleOutline });
  }

  async ngOnInit() {
    // Sin señal se usa lo último que se supo del servidor
    firstValueFrom(this.http.get<{ fotos?: string }>(`${environment.apiUrl}/salud`))
      .then((r) => {
        const si = !!r.fotos && r.fotos !== 'sin configurar';
        this.fotosDisponibles.set(si);
        almacen.guardar('fotos_disponibles', si);
      })
      .catch(async () => this.fotosDisponibles.set((await almacen.leer<boolean>('fotos_disponibles')) ?? null));
    this.ia.estado().then((e) => this.iaActiva.set(e.activa)).catch(() => undefined);
    this.voz.disponible().then((v) => this.vozDisponible.set(v));
    this.catalogo.municipios().then((m) => this.municipios.set(m)).catch(() => undefined);
    try {
      this.categorias.set(await this.catalogo.categorias());
      const enCola = this.pendiente() ? this.sync.cambio(this.pendiente()!)
        : this.sync.cambios().find((c) => c.tipo === 'actualizar' && c.productoId === +this.id()!);
      if (this.pendiente() && enCola?.datos) {
        // Producto nuevo guardado sin señal: se sigue editando el mismo (mismo clienteId)
        this.clienteId = enCola.id;
        this.cargarDeCola(enCola);
      } else if (this.id()) {
        const p = (await this.srv.listar()).find((x) => x.id === +this.id()!);
        if (p) {
          this.form.patchValue({ ...p, precio: Number(p.precio), descripcion: p.descripcion ?? '' });
          this.vistaPrevia.set(p.fotoUrl);
          this.activoActual.set(p.activo);
        }
        if (enCola?.datos) this.cargarDeCola(enCola); // la última edición hecha sin señal manda
      }
    } catch (e) {
      this.avisos.error(e);
    }
  }

  private cargarDeCola(c: Cambio) {
    this.form.patchValue({ ...c.datos!, descripcion: c.datos!.descripcion ?? '' });
    this.activoActual.set(!!c.datos!.activo);
    if (c.foto) {
      this.fotoNueva = c.foto;
      this.vistaPrevia.set(URL.createObjectURL(c.foto));
    }
    if (c.error) this.estadoIa.set({ tipo: 'nada', texto: `El servidor no aceptó este cambio: ${c.error}. Corrígelo y guarda de nuevo.` });
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

  /** 6.4 → "+6,4 %" (formato colombiano) */
  porcentaje(t: number) {
    return `${t > 0 ? '+' : ''}${t.toLocaleString('es-CO')} %`;
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
    if (!this.id() && !this.pendiente() && this.iaActiva() && this.sync.enLinea()) this.reconocer(foto);
  }

  /** La IA mira la foto y llena nombre, categoría, unidad y descripción (sin pisar lo que el productor escribió) */
  private async reconocer(foto: Blob) {
    this.estadoIa.set({ tipo: 'trabajando', texto: 'Mirando la foto…' });
    try {
      const r = await this.ia.reconocerFoto(foto);
      if (!r.reconocido) {
        this.estadoIa.set({ tipo: 'nada', texto: 'No reconocimos el producto en la foto. Escribe el nombre o dicta los datos.' });
        return;
      }
      const c = this.form.controls;
      const libre = (k: 'nombre' | 'categoriaId' | 'unidad' | 'descripcion') => this.deIa().has(k) || !c[k].dirty;
      const llenos: Record<string, string | number> = {};
      if (r.nombre && libre('nombre')) llenos['nombre'] = r.nombre;
      if (r.categoriaId && libre('categoriaId')) llenos['categoriaId'] = r.categoriaId;
      if (r.unidad && libre('unidad')) llenos['unidad'] = r.unidad;
      if (r.descripcion && libre('descripcion') && !c.descripcion.value) llenos['descripcion'] = r.descripcion;
      this.aplicar(llenos);
      const dudosa = r.confianza === 'baja' ? ' No estamos seguros: revísalo.' : '';
      this.estadoIa.set({ tipo: 'listo', texto: `Parece ${r.nombre}. Llenamos ${this.nombresCampos(llenos)}.${dudosa} Dicta o escribe el precio y la cantidad.` });
      vibrar.toque();
      this.sugerirSiFalta();
    } catch {
      this.estadoIa.set({ tipo: 'nada', texto: 'No pudimos revisar la foto ahora. Puedes llenar los datos tú mismo.' });
    }
  }

  /** Escucha al productor y llena los campos que dijo */
  async dictar() {
    if (!this.sync.enLinea()) {
      this.estadoIa.set({ tipo: 'nada', texto: 'Sin señal no se puede dictar. Escribe los datos: se guardan en el teléfono.' });
      return;
    }
    let texto: string;
    try {
      this.estadoIa.set({ tipo: 'trabajando', texto: 'Escuchando… di el producto, el precio y cuánto tienes.' });
      texto = await this.voz.escuchar('Di el producto, el precio y cuánto tienes');
    } catch (e) {
      this.estadoIa.set({ tipo: 'nada', texto: e instanceof VozError ? e.message : 'No pudimos usar el micrófono.' });
      return;
    }
    this.estadoIa.set({ tipo: 'trabajando', texto: `Entendiendo: “${texto}”` });
    try {
      const r = await this.ia.dictado(texto);
      const llenos: Record<string, string | number> = {};
      if (r.nombre) llenos['nombre'] = r.nombre;
      if (r.categoriaId) llenos['categoriaId'] = r.categoriaId;
      if (r.unidad) llenos['unidad'] = r.unidad;
      if (r.precio) llenos['precio'] = r.precio;
      if (r.stock !== null) llenos['stock'] = r.stock;
      if (!Object.keys(llenos).length) {
        this.estadoIa.set({ tipo: 'nada', texto: `Escuchamos “${texto}”, pero no encontramos datos del producto. Intenta: “Papa pastusa a 45 mil la arroba, tengo 40”.` });
        return;
      }
      this.aplicar(llenos);
      vibrar.toque();
      const falta = (['precio', 'stock'] as const).filter((k) => !(k in llenos) && !this.form.controls[k].value)
        .map((k) => (k === 'precio' ? 'el precio' : 'la cantidad'));
      this.estadoIa.set({ tipo: 'listo', texto: `Escuchamos “${texto}”. Llenamos ${this.nombresCampos(llenos)}.${falta.length ? ` Falta ${falta.join(' y ')}.` : ' Revisa y publica.'}` });
      this.sugerirSiFalta();
    } catch (e) {
      this.estadoIa.set({ tipo: 'nada', texto: `Escuchamos “${texto}”, pero no pudimos procesarlo: ${mensajeError(e)}` });
    }
  }

  private aplicar(valores: Record<string, string | number>) {
    this.form.patchValue(valores);
    for (const k of Object.keys(valores)) this.form.get(k)?.markAsDirty();
    this.deIa.update((s) => new Set([...s, ...Object.keys(valores)]));
  }

  private nombresCampos(valores: Record<string, unknown>) {
    const n: Record<string, string> = { nombre: 'el nombre', categoriaId: 'la categoría', unidad: 'la unidad', descripcion: 'la descripción', precio: 'el precio', stock: 'la cantidad' };
    const lista = Object.keys(valores).map((k) => n[k]);
    return lista.length > 1 ? `${lista.slice(0, -1).join(', ')} y ${lista.at(-1)}` : lista[0] ?? 'nada';
  }

  /** Si no hay precio, muestra de una vez el precio de referencia para usarlo con un toque */
  private sugerirSiFalta() {
    if (!this.form.controls.precio.value && this.puedeSugerir() && !this.sugiriendo()) this.sugerirPrecio();
  }

  /** publicar = visible para compradores; si no, queda como borrador (no visible) */
  async guardar(publicar: boolean) {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.avisos.error(new Error('Revisa los campos marcados'));
      return;
    }
    // Publicar exige foto cuando el servidor puede guardarlas; el borrador nunca la exige
    if (publicar && this.fotosDisponibles() && !this.vistaPrevia()) {
      this.errorFoto.set('Agrega una foto para publicar. Sin foto puedes guardarlo como borrador.');
      document.querySelector('.foto')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    this.guardando.set(true);
    const datos = { ...this.form.getRawValue(), activo: publicar };
    // Sin señal (o si la red falla al guardar): queda en el teléfono y se envía después
    if (!this.sync.enLinea() || this.pendiente()) {
      await this.guardarEnTelefono(datos, publicar);
      return;
    }
    try {
      const p = this.id() ? await this.srv.actualizar(+this.id()!, datos) : await this.srv.crear({ ...datos, clienteId: this.clienteId });
      if (this.fotoNueva) {
        try {
          await this.srv.subirFoto(p.id, this.fotoNueva);
        } catch (e) {
          // El producto ya quedó guardado: no se vuelve a crear; se avisa y se abre para reintentar la foto
          this.avisos.error(new Error(`El producto se guardó, pero la foto no: ${mensajeError(e)}`));
          if (!this.id()) await this.nav.navigateRoot(['/productor/producto', p.id, 'editar']);
          return;
        }
      }
      const segundos = Math.round((performance.now() - this.inicio) / 1000);
      vibrar.exito();
      await this.avisos.exito(publicar
        ? (this.id() ? 'Producto publicado' : `Producto publicado en ${segundos < 120 ? segundos + ' s' : Math.round(segundos / 60) + ' min'}`)
        : 'Guardado como borrador: los compradores aún no lo ven');
      await this.nav.navigateBack('/productor/tabs/productos');
    } catch (e) {
      if (e instanceof HttpErrorResponse && (e.status === 0 || e.status >= 500)) await this.guardarEnTelefono(datos, publicar);
      else this.avisos.error(e);
    } finally {
      this.guardando.set(false);
    }
  }

  /** Guarda el cambio en la cola del teléfono; se publica solo cuando vuelva la señal */
  private async guardarEnTelefono(datos: ProductoForm, publicar: boolean) {
    try {
      await this.sync.encolar(this.id()
        ? { id: crypto.randomUUID(), tipo: 'actualizar', productoId: +this.id()!, nombre: datos.nombre, datos, foto: this.fotoNueva ?? undefined }
        : { id: this.clienteId, tipo: 'crear', nombre: datos.nombre, datos, foto: this.fotoNueva ?? undefined });
      vibrar.exito();
      await this.avisos.exito(publicar
        ? 'Sin señal: quedó guardado en el teléfono y se publicará solo cuando vuelva la conexión'
        : 'Sin señal: el borrador quedó guardado en el teléfono');
      await this.nav.navigateBack('/productor/tabs/productos');
    } catch (e) {
      this.avisos.error(new Error(`No se pudo guardar en el teléfono: ${mensajeError(e)}`));
    } finally {
      this.guardando.set(false);
    }
  }

  async eliminar() {
    const nombre = this.form.controls.nombre.value || 'este producto';
    if (!(await this.avisos.confirmar('Eliminar producto', `¿Eliminar "${nombre}"? Esta acción no se puede deshacer.`, 'Eliminar'))) return;
    if (!this.sync.enLinea()) {
      await this.sync.encolar({ id: crypto.randomUUID(), tipo: 'eliminar', productoId: +this.id()!, nombre });
      this.avisos.exito('Sin señal: se eliminará cuando vuelva la conexión');
      await this.nav.navigateBack('/productor/tabs/productos');
      return;
    }
    try {
      const r = await this.srv.eliminar(+this.id()!);
      this.avisos.exito(r.desactivado ? 'Tenía pedidos: quedó pausado para conservar el historial' : 'Producto eliminado');
      await this.nav.navigateBack('/productor/tabs/productos');
    } catch (e) {
      this.avisos.error(e);
    }
  }
}
