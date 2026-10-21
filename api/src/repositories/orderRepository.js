import { desc, eq } from 'drizzle-orm';
import { db } from '../db/index.js';
import { pedidos, detallePedido, calificaciones } from '../db/schema.js';

const conDetalles = {
  detalles: { with: { producto: { columns: { id: true, nombre: true, unidad: true, fotoUrl: true } } } },
  productor: { columns: { id: true, nombreFinca: true }, with: { usuario: { columns: { nombre: true, telefono: true } } } },
  comprador: { columns: { id: true, nombre: true, telefono: true } },
  calificacion: true,
};

export const pedidoRepository = {
  crear: (datos, tx) => tx.insert(pedidos).values(datos).returning().then((r) => r[0]),
  crearDetalles: (filas, tx) => tx.insert(detallePedido).values(filas),
  porId: (id, tx = db) => (tx.query ?? db.query).pedidos.findFirst({ where: eq(pedidos.id, id), with: conDetalles }),
  delComprador: (compradorId) => db.query.pedidos.findMany({
    where: eq(pedidos.compradorId, compradorId), orderBy: desc(pedidos.creadoEn), with: conDetalles,
  }),
  delProductor: (productorId) => db.query.pedidos.findMany({
    where: eq(pedidos.productorId, productorId), orderBy: desc(pedidos.creadoEn), with: conDetalles,
  }),
  cambiarEstado: (id, estado, tx = db) => tx.update(pedidos).set({ estado }).where(eq(pedidos.id, id)).returning().then((r) => r[0]),
  calificar: (datos) => db.insert(calificaciones).values(datos).returning().then((r) => r[0]),
};
