import { Injectable, OnDestroy, inject, signal } from '@angular/core';
import { NavController, ToastController } from '@ionic/angular';
import { App as CapApp } from '@capacitor/app';
import type { PluginListenerHandle } from '@capacitor/core';
import { AuthService } from './auth.service';
import { PedidosService } from './orders.service';
import { almacen } from './storage';
import { EstadoPedido, Pedido } from './models';
import { ESTADOS } from '../shared/format';
import { addIcons } from 'ionicons';
import { notificationsOutline } from 'ionicons/icons';

const CADA_MS = 60_000;

/**
 * Avisos de cambios reales en los pedidos mientras la app está abierta.
 * Cada minuto (y al volver a la app) consulta /api/pedidos y lo compara con lo último que se vio:
 *  - comprador: cuando el productor confirma, marca listo, entrega o rechaza un pedido
 *  - productor: cuando llega un pedido nuevo
 * Muestra un aviso con botón "Ver" y un número en la pestaña Pedidos.
 * Las notificaciones con la app cerrada necesitan Firebase Cloud Messaging (ver README).
 */
@Injectable({ providedIn: 'root' })
export class NovedadesPedidosService implements OnDestroy {
  private auth = inject(AuthService);
  private pedidos = inject(PedidosService);
  private toast = inject(ToastController);
  private nav = inject(NavController);
  private temporizador: ReturnType<typeof setInterval> | null = null;
  private alVolver: PluginListenerHandle | null = null;
  private revisando = false;

  /** Cantidad de novedades sin ver (para el número en la pestaña Pedidos) */
  readonly novedades = signal(0);

  constructor() {
    addIcons({ notificationsOutline });
  }

  async iniciar() {
    if (this.temporizador) return;
    this.temporizador = setInterval(() => this.revisar(), CADA_MS);
    this.alVolver = await CapApp.addListener('resume', () => this.revisar()).catch(() => null);
    this.revisar();
  }

  detener() {
    if (this.temporizador) clearInterval(this.temporizador);
    this.temporizador = null;
    this.alVolver?.remove();
    this.alVolver = null;
  }

  /** Al abrir la lista de pedidos, las novedades quedan vistas */
  marcarVistas() {
    this.novedades.set(0);
  }

  private clave() {
    return `pedidos_vistos_${this.auth.usuario()?.id ?? 'x'}`;
  }

  async revisar() {
    const usuario = this.auth.usuario();
    if (!usuario || this.revisando || (typeof document !== 'undefined' && document.visibilityState === 'hidden')) return;
    this.revisando = true;
    try {
      const lista = await this.pedidos.listar();
      const antes = await almacen.leer<Record<number, EstadoPedido>>(this.clave());
      const ahora = Object.fromEntries(lista.map((p) => [p.id, p.estado])) as Record<number, EstadoPedido>;
      await almacen.guardar(this.clave(), ahora);
      if (!antes) return; // primera vez en este teléfono: solo se guarda, sin avisos

      const cambios = lista.filter((p) =>
        usuario.rol === 'PRODUCTOR' ? !(p.id in antes) : p.id in antes && antes[p.id] !== p.estado);
      if (!cambios.length) return;
      this.novedades.update((n) => n + cambios.length);
      await this.avisar(cambios, usuario.rol === 'PRODUCTOR');
    } catch {
      // sin conexión: se intenta en la próxima vuelta
    } finally {
      this.revisando = false;
    }
  }

  private async avisar(cambios: Pedido[], esProductor: boolean) {
    const p = cambios[0];
    const mensaje = cambios.length > 1
      ? (esProductor ? `Tienes ${cambios.length} pedidos nuevos` : `${cambios.length} de tus pedidos cambiaron de estado`)
      : esProductor
        ? `Pedido nuevo #${p.id} de ${p.comprador.nombre}`
        : `Tu pedido #${p.id} de ${p.productor.nombreFinca}: ${ESTADOS[p.estado].texto.toLowerCase()}`;
    const ruta = cambios.length > 1
      ? (esProductor ? '/productor/tabs/pedidos' : '/comprador/tabs/pedidos')
      : [esProductor ? '/productor/pedido' : '/comprador/pedido', p.id];
    const t = await this.toast.create({
      message: mensaje, duration: 6000, position: 'top', color: 'dark', icon: 'notifications-outline',
      buttons: [{ text: 'Ver', handler: () => { this.nav.navigateForward(ruta as string | (string | number)[]); } }],
    });
    await t.present();
  }

  ngOnDestroy() {
    this.detener();
  }
}
