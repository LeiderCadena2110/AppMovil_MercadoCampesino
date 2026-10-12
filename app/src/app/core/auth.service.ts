import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { NavController } from '@ionic/angular';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';
import { almacen } from './almacen';
import { Rol, Sesion, Usuario } from './models';

const CLAVE = 'sesion';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  private nav = inject(NavController);
  private sesion = signal<Sesion | null>(null);

  readonly usuario = computed(() => this.sesion()?.usuario ?? null);
  readonly token = computed(() => this.sesion()?.token ?? null);
  readonly autenticado = computed(() => !!this.sesion());

  /** Se llama al arrancar la app: recupera la sesión guardada */
  async cargar() {
    this.sesion.set(await almacen.leer<Sesion>(CLAVE));
  }

  async login(email: string, password: string) {
    const s = await firstValueFrom(this.http.post<Sesion>(`${environment.apiUrl}/auth/login`, { email, password }));
    await this.guardar(s);
    return s.usuario;
  }

  async registrar(datos: Record<string, unknown>) {
    const s = await firstValueFrom(this.http.post<Sesion>(`${environment.apiUrl}/auth/registro`, datos));
    await this.guardar(s);
    return s.usuario;
  }

  async salir() {
    this.sesion.set(null);
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
    await almacen.guardar(CLAVE, s);
  }

  actualizarUsuario(u: Usuario) {
    const s = this.sesion();
    if (s) this.guardar({ ...s, usuario: u });
  }
}
