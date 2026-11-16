import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient, HttpContext, HttpContextToken, HttpErrorResponse } from '@angular/common/http';
import { NavController } from '@ionic/angular';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';
import { almacen } from './storage';
import { almacenSeguro } from './secure-storage';
import { Rol, Sesion, Usuario } from './models';

const CLAVE = 'sesion';

/** Marca las peticiones de sesión para que el interceptor no las reintente ni les ponga token */
export const SIN_REINTENTO = new HttpContextToken<boolean>(() => false);
const contexto = () => new HttpContext().set(SIN_REINTENTO, true);
/** El refresh no se pudo intentar (sin internet o servidor caído): la sesión se conserva */
export const SIN_CONEXION = 'SIN_CONEXION';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  private nav = inject(NavController);
  private sesion = signal<Sesion | null>(null);
  /** Un solo refresh a la vez aunque fallen varias peticiones juntas */
  private refrescando: Promise<string | null> | null = null;

  readonly usuario = computed(() => this.sesion()?.usuario ?? null);
  readonly token = computed(() => this.sesion()?.token ?? null);
  readonly autenticado = computed(() => !!this.sesion());

  /** Se llama al arrancar la app: recupera la sesión guardada (cifrada) */
  async cargar() {
    let s = await almacenSeguro.leer<Sesion>(CLAVE);
    if (!s) {
      // Versiones anteriores guardaban la sesión sin cifrar: se migra y se borra la copia vieja
      s = await almacen.leer<Sesion>(CLAVE);
      if (s) {
        await almacenSeguro.guardar(CLAVE, s);
        await almacen.borrar(CLAVE);
      }
    }
    this.sesion.set(s);
  }

  async login(email: string, password: string) {
    const s = await firstValueFrom(this.http.post<Sesion>(`${environment.apiUrl}/auth/login`, { email, password }, { context: contexto() }));
    await this.guardar(s);
    return s.usuario;
  }

  async registrar(datos: Record<string, unknown>) {
    const s = await firstValueFrom(this.http.post<Sesion>(`${environment.apiUrl}/auth/registro`, datos, { context: contexto() }));
    await this.guardar(s);
    return s.usuario;
  }

  /**
   * Pide un token de acceso nuevo con el refresh token (que también se renueva).
   * Devuelve el token nuevo, null si la sesión ya no es válida, o SIN_CONEXION si no se pudo preguntar.
   */
  refrescar(): Promise<string | null> {
    this.refrescando ??= (async () => {
      const refreshToken = this.sesion()?.refreshToken;
      if (!refreshToken) return null;
      try {
        const s = await firstValueFrom(this.http.post<Sesion>(`${environment.apiUrl}/auth/refresh`, { refreshToken }, { context: contexto() }));
        await this.guardar(s);
        return s.token;
      } catch (e) {
        if (e instanceof HttpErrorResponse && (e.status === 0 || e.status >= 500)) return SIN_CONEXION;
        return null;
      }
    })().finally(() => (this.refrescando = null));
    return this.refrescando;
  }

  async salir() {
    const refreshToken = this.sesion()?.refreshToken;
    this.sesion.set(null);
    // Se revoca en el servidor sin esperar: si no hay internet, igual se cierra en el teléfono
    if (refreshToken) {
      this.http.post(`${environment.apiUrl}/auth/logout`, { refreshToken }, { context: contexto() }).subscribe({ error: () => undefined });
    }
    await almacenSeguro.borrar(CLAVE);
    await almacen.borrar(CLAVE);
    await almacen.borrar('carrito');
    await this.nav.navigateRoot('/bienvenida');
  }

  /** Ruta de inicio según el rol */
  inicioDe(rol: Rol | undefined) {
    if (rol === 'PRODUCTOR') return '/productor/tabs/panel';
    if (rol === 'ADMIN') return '/admin';
    return '/comprador/tabs/inicio';
  }

  private async guardar(s: Sesion) {
    this.sesion.set(s);
    await almacenSeguro.guardar(CLAVE, s);
  }

  actualizarUsuario(u: Usuario) {
    const s = this.sesion();
    if (s) this.guardar({ ...s, usuario: u });
  }
}
