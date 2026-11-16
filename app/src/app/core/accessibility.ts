/**
 * Ionicons pone role="img" en todos los íconos. Los que no tienen aria-label son decorativos
 * (van junto a un texto o dentro de un botón con nombre), así que se ocultan a los lectores
 * de pantalla para que no lean "imagen" sin nombre. Los íconos con aria-label se respetan.
 */
export function ocultarIconosDecorativos(raiz: Node = document.body) {
  const marcar = (el: Element) => {
    if (el.tagName !== 'ION-ICON') return;
    if (el.hasAttribute('aria-label')) {
      // Si luego recibe nombre, vuelve a ser visible para el lector
      if (el.hasAttribute('data-mc-deco')) { el.removeAttribute('aria-hidden'); el.removeAttribute('data-mc-deco'); }
    } else if (!el.hasAttribute('aria-hidden')) {
      el.setAttribute('aria-hidden', 'true');
      el.setAttribute('data-mc-deco', '');
    }
  };
  const recorrer = (n: Node) => {
    if (!(n instanceof Element)) return;
    marcar(n);
    n.querySelectorAll('ion-icon').forEach(marcar);
  };
  recorrer(raiz);
  new MutationObserver((cambios) => {
    for (const c of cambios) {
      if (c.type === 'attributes') marcar(c.target as Element);
      else c.addedNodes.forEach(recorrer);
    }
  }).observe(raiz, { childList: true, subtree: true, attributes: true, attributeFilter: ['aria-label'] });
}
