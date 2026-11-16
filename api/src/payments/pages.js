// Páginas HTML mínimas del flujo de pago (se abren en el navegador dentro de la app).
const pesos = (n) => `$${Math.round(Number(n)).toLocaleString('es-CO')}`;
const esc = (t) => String(t).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

const pagina = (titulo, cuerpo) => `<!doctype html>
<html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(titulo)} · Minga App</title>
<style>
  :root { color-scheme: light dark; --verde: #2b7f3a; --fondo: #f3f6f1; --tarjeta: #fff; --tinta: #18221b; --suave: #5b6b5f; }
  @media (prefers-color-scheme: dark) { :root { --verde: #7fd18b; --fondo: #0f1511; --tarjeta: #18211b; --tinta: #e7ece5; --suave: #a9b5ab; } }
  body { margin: 0; min-height: 100vh; display: grid; place-items: center; padding: 16px; box-sizing: border-box;
    background: var(--fondo); color: var(--tinta); font: 16px/1.5 system-ui, sans-serif; }
  main { width: 100%; max-width: 380px; background: var(--tarjeta); border-radius: 24px; padding: 28px 22px; box-shadow: 0 18px 40px -24px rgb(0 0 0 / .4); text-align: center; }
  h1 { font-size: 1.4rem; margin: 8px 0; } p { color: var(--suave); margin: 6px 0; }
  .monto { font-size: 2rem; font-weight: 800; color: var(--tinta); margin: 14px 0 4px; font-variant-numeric: tabular-nums; }
  .aviso { font-size: .82rem; background: color-mix(in srgb, #e3a92b 22%, transparent); color: var(--tinta); border-radius: 12px; padding: 8px 10px; margin: 14px 0; }
  form { display: grid; gap: 10px; margin-top: 18px; }
  button { font: inherit; font-weight: 700; border: 0; border-radius: 999px; min-height: 50px; cursor: pointer; }
  .si { background: var(--verde); color: #fff; } .no { background: transparent; color: var(--suave); border: 1.5px solid currentColor; }
  @media (prefers-color-scheme: dark) { .si { color: #0f1511; } }
  .icono { font-size: 2.6rem; }
</style></head><body><main>${cuerpo}</main></body></html>`;

export function paginaPagoSimulado(proveedorId, cobro) {
  if (!cobro) return pagina('Pago no encontrado', '<h1>Este pago ya no existe</h1><p>Vuelve a Minga App e intenta pagar de nuevo.</p>');
  if (cobro.estado !== 'PENDIENTE') return paginaResultado(cobro.estado);
  return pagina('Pagar', `
    <p>Pasarela de pagos de prueba</p>
    <h1>Minga App</h1>
    <div class="monto">${pesos(cobro.monto)}</div>
    <p>Total de tu compra</p>
    <div class="aviso">Modo de prueba: no se cobra dinero real. Elige el resultado del pago.</div>
    <form method="post" action="/api/pagos/simulado/${esc(proveedorId)}/resultado">
      <button class="si" name="resultado" value="aprobar">Pagar ${pesos(cobro.monto)}</button>
      <button class="no" name="resultado" value="rechazar">Simular pago rechazado</button>
    </form>`);
}

export function paginaResultado(estado) {
  const t = {
    APROBADO: ['✅', 'Pago aprobado', 'Tu pedido quedó pagado. Cierra esta ventana para volver a Minga App.'],
    RECHAZADO: ['❌', 'El pago no se aprobó', 'No se cobró nada. Cierra esta ventana y vuelve a intentarlo desde tu pedido.'],
    PENDIENTE: ['⏳', 'Pago en proceso', 'Te avisaremos cuando se confirme. Cierra esta ventana para volver a Minga App.'],
  }[estado] ?? ['ℹ️', 'Vuelve a Minga App', 'Cierra esta ventana para ver el estado de tu pedido.'];
  return pagina(t[1], `<div class="icono" aria-hidden="true">${t[0]}</div><h1>${t[1]}</h1><p>${t[2]}</p>`);
}
