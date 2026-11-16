import { Injectable, inject } from '@angular/core';
import { NavController } from '@ionic/angular';
import { ProductoLista } from './models';

/** Nombre compartido: la foto de la tarjeta "viaja" hasta la foto del detalle */
export const FOTO_COMPARTIDA = 'foto-producto';

type DocConTransiciones = Document & { startViewTransition?: (cb: () => Promise<void>) => { finished: Promise<void> } };

/**
 * Abre el detalle de un producto con una transición compartida (View Transitions API):
 * la foto de la tarjeta crece hasta convertirse en la foto del detalle.
 * Si el WebView no la soporta o el teléfono pide reducir movimiento, navega con la animación normal.
 * El detalle recibe el producto en el estado de la navegación y lo muestra al instante.
 */
@Injectable({ providedIn: 'root' })
export class TransicionesService {
  private nav = inject(NavController);

  async abrirProducto(producto: ProductoLista, foto: HTMLElement | null) {
    const ruta = ['/comprador/producto', producto.id];
    const extras = { state: { producto } };
    const doc = document as DocConTransiciones;
    const reducir = matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (!foto || !doc.startViewTransition || reducir) {
      await this.nav.navigateForward(ruta, extras);
      return;
    }
    foto.style.viewTransitionName = FOTO_COMPARTIDA;
    const transicion = doc.startViewTransition(async () => {
      foto.style.viewTransitionName = '';
      await this.nav.navigateForward(ruta, { ...extras, animated: false });
      await esperar(() => !!document.querySelector(`img[data-foto-compartida]`), 400);
    });
    await transicion.finished.catch(() => undefined);
  }
}

/** Espera (máx. ms) a que se cumpla la condición, revisando en cada cuadro */
function esperar(condicion: () => boolean, ms: number) {
  return new Promise<void>((listo) => {
    const fin = performance.now() + ms;
    const revisar = () => (condicion() || performance.now() > fin ? listo() : requestAnimationFrame(revisar));
    revisar();
  });
}
