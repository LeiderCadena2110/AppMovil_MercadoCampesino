import { Injectable, effect, inject, signal } from '@angular/core';
import { AuthService } from './auth.service';
import { almacen } from './storage';

/**
 * Favoritos del comprador. Se guardan en el teléfono (solo los ids), por usuario.
 * Al mostrarlos se consultan de nuevo a la API, así el precio y la cantidad siempre son los actuales.
 * Para sincronizarlos entre teléfonos haría falta una tabla "favoritos" en la base de datos.
 */
@Injectable({ providedIn: 'root' })
export class FavoritosService {
  private auth = inject(AuthService);
  readonly ids = signal<number[]>([]);
  private cargadoPara: number | null = null;

  constructor() {
    // Se cargan los del usuario que inició sesión (y se limpian al cambiar de usuario)
    effect(() => {
      const id = this.auth.usuario()?.id ?? null;
      if (id === this.cargadoPara) return;
      this.cargadoPara = id;
      this.ids.set([]);
      if (id) almacen.leer<number[]>(this.clave(id)).then((v) => this.cargadoPara === id && this.ids.set(v ?? []));
    });
  }

  private clave(id = this.cargadoPara) {
    return `favoritos_${id}`;
  }

  es(id: number) {
    return this.ids().includes(id);
  }

  /** Agrega o quita; devuelve true si quedó como favorito */
  alternar(id: number) {
    const ya = this.es(id);
    this.ids.update((l) => (ya ? l.filter((x) => x !== id) : [id, ...l].slice(0, 50)));
    almacen.guardar(this.clave(), this.ids());
    return !ya;
  }

  quitar(id: number) {
    if (this.es(id)) this.alternar(id);
  }
}
