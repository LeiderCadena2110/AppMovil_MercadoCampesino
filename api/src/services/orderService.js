import { db } from '../db/index.js';
import { pedidoRepository } from '../repositories/orderRepository.js';
import { productoRepository } from '../repositories/productRepository.js';
import { ErrorApp } from '../middlewares/errors.js';

// Qué estado puede seguir a cada uno
const TRANSICIONES = {
  PENDIENTE: ['ACEPTADO', 'RECHAZADO'],
  ACEPTADO: ['LISTO'],
  LISTO: ['ENTREGADO'],
  RECHAZADO: [],
  ENTREGADO: [],
};

export const pedidoService = {
  // Un carrito con productos de varios productores genera un pedido por productor
  async crear(compradorId, { direccion, metodoEntrega, items }) {
    return db.transaction(async (tx) => {
      const porProductor = new Map();
      for (const { productoId, cantidad } of items) {
        const p = await productoRepository.porId(productoId, tx);
        if (!p || !p.activo || p.oculto) throw new ErrorApp(400, `El producto ${productoId} no está disponible`);
        const ok = await productoRepository.descontarStock(productoId, cantidad, tx);
        if (ok.length === 0) throw new ErrorApp(409, `No hay suficiente "${p.nombre}" (quedan ${p.stock} ${p.unidad})`);
        const grupo = porProductor.get(p.productorId) ?? [];
        grupo.push({ productoId, cantidad, precioUnitario: p.precio });
        porProductor.set(p.productorId, grupo);
      }

      const creados = [];
      for (const [productorId, lineas] of porProductor) {
        const total = lineas.reduce((s, l) => s + Number(l.precioUnitario) * l.cantidad, 0);
        const pedido = await pedidoRepository.crear({
          compradorId, productorId, direccion, metodoEntrega, total: total.toFixed(2),
        }, tx);
        await pedidoRepository.crearDetalles(lineas.map((l) => ({ ...l, pedidoId: pedido.id })), tx);
        creados.push(pedido);
      }
      return creados;
    });
  },

  listar: (usuario) => (usuario.rol === 'PRODUCTOR'
    ? pedidoRepository.delProductor(usuario.productorId)
    : pedidoRepository.delComprador(usuario.id)),

  async detalle(usuario, id) {
    const pedido = await pedidoRepository.porId(id);
    if (!pedido) throw new ErrorApp(404, 'Pedido no encontrado');
    const esDueno = pedido.compradorId === usuario.id || pedido.productorId === usuario.productorId || usuario.rol === 'ADMIN';
    if (!esDueno) throw new ErrorApp(403, 'No puedes ver este pedido');
    return pedido;
  },

  async cambiarEstado(usuario, id, nuevo) {
    return db.transaction(async (tx) => {
      const pedido = await pedidoRepository.porId(id, tx);
      if (!pedido) throw new ErrorApp(404, 'Pedido no encontrado');
      if (pedido.productorId !== usuario.productorId) throw new ErrorApp(403, 'Este pedido no es tuyo');
      if (!TRANSICIONES[pedido.estado].includes(nuevo)) {
        throw new ErrorApp(409, `No se puede pasar de ${pedido.estado} a ${nuevo}`);
      }
      if (nuevo === 'RECHAZADO') {
        for (const d of pedido.detalles) await productoRepository.devolverStock(d.productoId, d.cantidad, tx);
      }
      // Aquí se enviaría la notificación push al comprador (Firebase Cloud Messaging)
      return pedidoRepository.cambiarEstado(id, nuevo, tx);
    });
  },

  async calificar(usuario, id, { puntaje, comentario }) {
    const pedido = await pedidoRepository.porId(id);
    if (!pedido || pedido.compradorId !== usuario.id) throw new ErrorApp(404, 'Pedido no encontrado');
    if (pedido.estado !== 'ENTREGADO') throw new ErrorApp(409, 'Solo puedes calificar pedidos entregados');
    if (pedido.calificacion) throw new ErrorApp(409, 'Este pedido ya fue calificado');
    return pedidoRepository.calificar({ pedidoId: id, puntaje, comentario });
  },
};
