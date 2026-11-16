import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { Network } from '@capacitor/network';
import { MisProductosService, ProductoForm } from './my-products.service';
import { baseLocal, COLA } from './local-db';
import { mensajeError } from './auth.interceptor';

/**
 * Un cambio del productor guardado en el teléfono hasta que haya señal.
 * - crear: `id` es el clienteId que va a la API (así un reenvío no duplica el producto)
 * - actualizar / eliminar: sobre un producto que ya existe en el servidor (`productoId`)
 */
export interface Cambio {
  id: string;
  tipo: 'crear' | 'actualizar' | 'eliminar';
  productoId?: number;
  nombre: string;
  datos?: ProductoForm;
  foto?: Blob;
  creadoEn: number;
  /** Motivo por el que el servidor no lo aceptó (el productor debe corregirlo) */
  error?: string;
}

const esFaltaDeSenal = (e: unknown) =>
  e instanceof HttpErrorResponse ? e.status === 0 || e.status >= 500 || e.status === 408 || e.status === 429 : true;

/**
 * Cola de cambios del productor para trabajar sin señal (en la finca o en la vía).
 * Guarda en IndexedDB y envía en orden cuando vuelve la conexión, cada vez que la app se abre
 * y cada minuto mientras haya pendientes. El servidor decide: si rechaza un cambio, queda marcado
 * con el motivo para que el productor lo corrija.
 */
@Injectable({ providedIn: 'root' })
export class SincronizacionService {
  private srv = inject(MisProductosService);
  readonly cambios = signal<Cambio[]>([]);
  readonly enLinea = signal(navigator.onLine);
  readonly sincronizando = signal(false);
  /** Aumenta cada vez que algo se envió: las pantallas lo usan para recargar */
  readonly version = signal(0);
  readonly pendientes = computed(() => this.cambios().length);
  readonly conError = computed(() => this.cambios().filter((c) => c.error));
  private iniciado = false;
  private enCurso: Promise<void> | null = null;

  async iniciar() {
    if (this.iniciado) return;
    this.iniciado = true;
    await this.recargar();
    try {
      this.enLinea.set((await Network.getStatus()).connected);
      await Network.addListener('networkStatusChange', (s) => {
        this.enLinea.set(s.connected);
        if (s.connected) this.sincronizar();
      });
    } catch {
      window.addEventListener('online', () => { this.enLinea.set(true); this.sincronizar(); });
      window.addEventListener('offline', () => this.enLinea.set(false));
    }
    setInterval(() => { if (this.pendientes() && this.enLinea()) this.sincronizar(); }, 60_000);
    if (this.pendientes()) this.sincronizar();
  }

  private async recargar() {
    try {
      const todos = await baseLocal.todos<Cambio>(COLA);
      this.cambios.set(todos.sort((a, b) => a.creadoEn - b.creadoEn));
    } catch {
      this.cambios.set([]);
    }
  }

  /** Busca el cambio pendiente de creación (para editarlo antes de que se envíe) */
  cambio = (id: string) => this.cambios().find((c) => c.id === id);

  /**
   * Agrega un cambio a la cola, combinándolo con lo que ya había:
   * editar un producto aún no enviado modifica su creación; eliminarlo la cancela;
   * dos ediciones del mismo producto quedan como una sola (la última).
   */
  async encolar(nuevo: Omit<Cambio, 'creadoEn'>) {
    const lista = this.cambios();
    const creacion = lista.find((c) => c.tipo === 'crear' && c.id === nuevo.id);
    if (creacion && nuevo.tipo === 'eliminar') {
      await baseLocal.borrar(COLA, creacion.id);
    } else if (creacion) {
      await baseLocal.guardar(COLA, { ...creacion, nombre: nuevo.nombre, datos: nuevo.datos, foto: nuevo.foto ?? creacion.foto, error: undefined });
    } else {
      const previa = nuevo.productoId ? lista.find((c) => c.tipo !== 'crear' && c.productoId === nuevo.productoId) : undefined;
      if (previa) await baseLocal.borrar(COLA, previa.id);
      // La foto nueva manda; si esta edición no trae foto, se conserva la de la edición anterior
      const foto = nuevo.tipo === 'eliminar' ? undefined : nuevo.foto ?? previa?.foto;
      await baseLocal.guardar(COLA, { ...nuevo, foto, creadoEn: previa?.creadoEn ?? Date.now() });
    }
    await this.recargar();
    if (this.enLinea()) this.sincronizar();
  }

  async descartar(id: string) {
    await baseLocal.borrar(COLA, id);
    await this.recargar();
  }

  /** Envía la cola en orden. Si falta la señal, se detiene y lo intenta después. */
  sincronizar(): Promise<void> {
    this.enCurso ??= this.enviar().finally(() => { this.enCurso = null; });
    return this.enCurso;
  }

  private async enviar() {
    this.sincronizando.set(true);
    let enviados = 0;
    try {
      for (const c of [...this.cambios()]) {
        if (c.error) continue; // espera a que el productor lo corrija
        try {
          await this.aplicar(c);
          await baseLocal.borrar(COLA, c.id);
          enviados++;
        } catch (e) {
          if (esFaltaDeSenal(e)) break; // se reintenta cuando vuelva la señal
          const noExiste = e instanceof HttpErrorResponse && e.status === 404 && c.tipo !== 'crear';
          if (noExiste) await baseLocal.borrar(COLA, c.id); // el producto ya no existe: nada que enviar
          else await baseLocal.guardar(COLA, { ...c, error: mensajeError(e) });
        }
      }
    } finally {
      await this.recargar();
      this.sincronizando.set(false);
      if (enviados) this.version.update((v) => v + 1);
    }
  }

  private async aplicar(c: Cambio) {
    if (c.tipo === 'eliminar') {
      await this.srv.eliminar(c.productoId!);
      return;
    }
    const producto = c.tipo === 'crear'
      ? await this.srv.crear({ ...c.datos!, clienteId: c.id })
      : await this.srv.actualizar(c.productoId!, c.datos!);
    if (c.foto) {
      try {
        await this.srv.subirFoto(producto.id, c.foto);
      } catch (e) {
        if (esFaltaDeSenal(e)) {
          // El producto ya se guardó: queda pendiente solo la foto, como una edición
          await baseLocal.guardar(COLA, { id: crypto.randomUUID(), tipo: 'actualizar', productoId: producto.id, nombre: c.nombre,
            datos: { ...c.datos!, activo: producto.activo }, foto: c.foto, creadoEn: Date.now() } satisfies Cambio);
        } else {
          console.warn('[sync] la foto no se pudo subir', e);
        }
      }
    }
  }
}
