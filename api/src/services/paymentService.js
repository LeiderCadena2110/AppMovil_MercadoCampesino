// Pagos en línea: crear el cobro de una compra, confirmar su estado y procesar los avisos de la pasarela.
// Regla de oro: el estado de un pago solo cambia con lo que responde la pasarela (consulta directa),
// nunca con lo que diga la app ni el cuerpo del webhook.
import { and, eq, inArray, sql } from 'drizzle-orm';
import { db } from '../db/index.js';
import { pagos, pedidos, usuarios } from '../db/schema.js';
import { pasarelaActiva, pasarelas } from '../payments/index.js';
import { env } from '../config/env.js';
import { ErrorApp } from '../middlewares/errors.js';
import { notificaciones } from './notificationService.js';

export const pagoService = {
  disponible: () => pasarelaActiva()?.nombre ?? null,

  /** Crea (o reutiliza) el cobro de unos pedidos del comprador y devuelve la URL para pagar */
  async crear(comprador, pedidoIds) {
    const pasarela = pasarelaActiva();
    if (!pasarela) throw new ErrorApp(503, 'Los pagos en línea no están disponibles. Elige pagar al recibir.');
    const lista = await db.query.pedidos.findMany({
      where: and(inArray(pedidos.id, pedidoIds), eq(pedidos.compradorId, comprador.id)),
      with: { detalles: { with: { producto: { columns: { nombre: true, unidad: true } } } }, pago: true },
    });
    if (lista.length !== new Set(pedidoIds).size) throw new ErrorApp(404, 'Pedido no encontrado');
    for (const p of lista) {
      if (p.pagoEstado === 'APROBADO') throw new ErrorApp(409, `El pedido #${p.id} ya está pagado`);
      if (p.pagoEstado === 'NO_APLICA') throw new ErrorApp(409, `El pedido #${p.id} se paga al recibir`);
      if (p.estado !== 'PENDIENTE') throw new ErrorApp(409, `El pedido #${p.id} ya no se puede pagar`);
    }
    // Si ya hay un cobro pendiente para exactamente estos pedidos, se reutiliza (no se cobra dos veces)
    const previo = lista[0].pago;
    if (previo && previo.estado === 'PENDIENTE' && previo.proveedor === pasarela.nombre && lista.every((p) => p.pagoId === previo.id)) {
      const otros = await db.select({ id: pedidos.id }).from(pedidos).where(eq(pedidos.pagoId, previo.id));
      if (otros.length === lista.length) return resumen(previo, lista);
    }

    const monto = lista.reduce((s, p) => s + Number(p.total), 0);
    const [pago] = await db.insert(pagos).values({ compradorId: comprador.id, proveedor: pasarela.nombre, monto: monto.toFixed(2) }).returning();
    const [{ email }] = await db.select({ email: usuarios.email }).from(usuarios).where(eq(usuarios.id, comprador.id));
    const items = lista.flatMap((p) => p.detalles.map((d) => ({ titulo: `${d.producto.nombre} (${d.producto.unidad})`, precio: Number(d.precioUnitario), cantidad: d.cantidad })));
    let cobro;
    try {
      cobro = await pasarela.crearCobro({ pago, items, email, urlRetorno: `${env.urlPublica}/api/pagos/retorno?pago=${pago.id}` });
    } catch (e) {
      console.error('[pagos] no se pudo crear el cobro:', e.message);
      await db.update(pagos).set({ estado: 'RECHAZADO', actualizadoEn: new Date() }).where(eq(pagos.id, pago.id));
      throw new ErrorApp(502, 'No pudimos conectar con la pasarela de pagos. Intenta de nuevo en un momento.');
    }
    const [listo] = await db.update(pagos).set({ proveedorId: cobro.proveedorId, urlPago: cobro.urlPago, actualizadoEn: new Date() })
      .where(eq(pagos.id, pago.id)).returning();
    await db.update(pedidos).set({ pagoId: pago.id, pagoEstado: 'PENDIENTE' }).where(inArray(pedidos.id, pedidoIds));
    return resumen(listo, lista);
  },

  /** Estado de un pago del comprador. Si sigue pendiente, se pregunta a la pasarela (por si el webhook tarda). */
  async estado(comprador, pagoId) {
    let pago = await db.query.pagos.findFirst({ where: and(eq(pagos.id, pagoId), eq(pagos.compradorId, comprador.id)), with: { pedidos: true } });
    if (!pago) throw new ErrorApp(404, 'Pago no encontrado');
    if (pago.estado === 'PENDIENTE' && pago.proveedorId) {
      try {
        const real = await pasarelas[pago.proveedor].consultar(pago.proveedorId);
        if (real !== pago.estado) {
          await aplicarEstado(pago, real);
          pago = { ...pago, estado: real };
        }
      } catch (e) {
        console.warn('[pagos] consulta a la pasarela falló:', e.message);
      }
    }
    return resumen(pago, pago.pedidos);
  },

  /**
   * Aviso (webhook) de la pasarela. Solo se acepta con firma válida; luego se consulta el estado real.
   * Devuelve { procesado } — siempre se responde 200 a avisos auténticos para que no se reintenten sin fin.
   */
  async procesarEvento(nombre, req) {
    const pasarela = pasarelas[nombre];
    if (!pasarela) throw new ErrorApp(404, 'Pasarela desconocida');
    const proveedorId = pasarela.verificarEvento(req);
    if (!proveedorId) throw new ErrorApp(401, 'Firma del aviso inválida');
    const pago = await db.query.pagos.findFirst({
      where: and(eq(pagos.proveedor, nombre), sql`lower(${pagos.proveedorId}) = ${proveedorId.toLowerCase()}`),
    });
    if (!pago) return { procesado: false, motivo: 'pago desconocido' };
    const real = await pasarela.consultar(pago.proveedorId);
    const cambio = await aplicarEstado(pago, real);
    return { procesado: true, estado: real, cambio };
  },

  /** Para la página de retorno (sin sesión): solo el estado, sin datos personales */
  async estadoPublico(pagoId) {
    if (!/^[0-9a-f-]{36}$/i.test(String(pagoId))) return null;
    const pago = await db.query.pagos.findFirst({ where: eq(pagos.id, pagoId), columns: { estado: true, monto: true } });
    return pago ?? null;
  },
};

/** Guarda el nuevo estado en el pago y en sus pedidos (una sola vez) y avisa al productor si se aprobó */
async function aplicarEstado(pago, estado) {
  if (estado === pago.estado) return false;
  const cambiados = await db.transaction(async (tx) => {
    // Solo si sigue en el estado que leímos: dos avisos simultáneos no procesan dos veces
    const [ok] = await tx.update(pagos).set({ estado, actualizadoEn: new Date() })
      .where(and(eq(pagos.id, pago.id), eq(pagos.estado, pago.estado))).returning({ id: pagos.id });
    if (!ok) return [];
    return tx.update(pedidos).set({ pagoEstado: estado }).where(eq(pedidos.pagoId, pago.id)).returning();
  });
  if (estado === 'APROBADO') for (const p of cambiados) notificaciones.pedidoPagado(p);
  return cambiados.length > 0;
}

const resumen = (pago, lista) => ({
  id: pago.id, estado: pago.estado, monto: Number(pago.monto), proveedor: pago.proveedor, urlPago: pago.urlPago,
  pedidoIds: lista.map((p) => p.id),
});
