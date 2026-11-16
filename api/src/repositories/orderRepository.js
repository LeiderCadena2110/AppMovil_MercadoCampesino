import { and, desc, eq, gte, inArray, notInArray, sql } from 'drizzle-orm';
import { db } from '../db/index.js';
import { pedidos, detallePedido, calificaciones } from '../db/schema.js';

const conDetalles = {
  detalles: { with: { producto: { columns: { id: true, nombre: true, unidad: true, fotoUrl: true } } } },
  productor: { columns: { id: true, nombreFinca: true }, with: { usuario: { columns: { nombre: true, telefono: true } } } },
  comprador: { columns: { id: true, nombre: true, telefono: true } },
  calificacion: true,
};

export const PEDIDOS_POR_PAGINA = 30;
const CERRADOS = ['ENTREGADO', 'RECHAZADO'];

/** Pedidos de un comprador o productor, del más reciente al más viejo, de a 30 */
function pagina(campo, valor, { pagina: n = 1, estado } = {}) {
  const filtros = [eq(campo, valor)];
  if (estado === 'activos') filtros.push(notInArray(pedidos.estado, CERRADOS));
  if (estado === 'cerrados') filtros.push(inArray(pedidos.estado, CERRADOS));
  return db.query.pedidos.findMany({
    where: and(...filtros),
    orderBy: [desc(pedidos.creadoEn), desc(pedidos.id)],
    limit: PEDIDOS_POR_PAGINA + 1, // uno de más para saber si hay otra página
    offset: (n - 1) * PEDIDOS_POR_PAGINA,
    with: conDetalles,
  });
}

export const pedidoRepository = {
  crear: (datos, tx) => tx.insert(pedidos).values(datos).returning().then((r) => r[0]),
  crearDetalles: (filas, tx) => tx.insert(detallePedido).values(filas),
  porId: (id, tx = db) => (tx.query ?? db.query).pedidos.findFirst({ where: eq(pedidos.id, id), with: conDetalles }),
  delComprador: (compradorId, opciones) => pagina(pedidos.compradorId, compradorId, opciones),
  delProductor: (productorId, opciones) => pagina(pedidos.productorId, productorId, opciones),
  cambiarEstado: (id, estado, tx = db) => tx.update(pedidos).set({ estado }).where(eq(pedidos.id, id)).returning().then((r) => r[0]),
  /** Total y número de pedidos entregados por día (hora de Colombia) desde una fecha */
  ventasPorDia: (productorId, desde) => {
    const dia = sql`to_char(${pedidos.creadoEn} at time zone 'America/Bogota', 'YYYY-MM-DD')`;
    return db.select({ fecha: dia, total: sql`coalesce(sum(${pedidos.total}), 0)`, pedidos: sql`count(*)::int` })
      .from(pedidos)
      .where(and(eq(pedidos.productorId, productorId), eq(pedidos.estado, 'ENTREGADO'), gte(pedidos.creadoEn, desde)))
      .groupBy(dia);
  },
  calificar: (datos) => db.insert(calificaciones).values(datos).returning().then((r) => r[0]),
};
