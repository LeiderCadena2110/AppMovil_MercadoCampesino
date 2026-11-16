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

  /**
   * Una copia pequeña de la foto "vuela" desde la tarjeta hasta el botón del carrito.
   * Se omite si no hay foto, no se ve el carrito o se pidió reducir el movimiento.
   */
  volarAlCarrito(foto: HTMLElement | null) {
    const destino = document.querySelector('ion-tab-button.mc-tab-central ion-icon');
    if (!foto || !destino || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const a = foto.getBoundingClientRect();
    const b = destino.getBoundingClientRect();
    if (!a.width || !b.width) return;
    const lado = Math.min(a.width, 96);
    const copia = foto.cloneNode(true) as HTMLElement;
    copia.removeAttribute('data-foto-compartida');
    Object.assign(copia.style, {
      position: 'fixed', zIndex: '9999', pointerEvents: 'none', margin: '0', objectFit: 'cover',
      left: `${a.left + a.width / 2 - lado / 2}px`, top: `${a.top + a.height / 2 - lado / 2}px`,
      width: `${lado}px`, height: `${lado}px`, borderRadius: '50%', boxShadow: 'var(--mc-e3)',
    });
    document.body.appendChild(copia);
    const dx = b.left + b.width / 2 - (a.left + a.width / 2);
    const dy = b.top + b.height / 2 - (a.top + a.height / 2);
    const anim = copia.animate(
      [
        { transform: 'translate(0, 0) scale(1)', opacity: 1 },
        { transform: `translate(${dx * 0.45}px, ${dy * 0.2 - 60}px) scale(0.7)`, opacity: 1, offset: 0.45 },
        { transform: `translate(${dx}px, ${dy}px) scale(0.18)`, opacity: 0.6 },
      ],
      { duration: 650, easing: 'cubic-bezier(0.3, 0, 0.4, 1)' },
    );
    anim.onfinish = anim.oncancel = () => copia.remove();
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
